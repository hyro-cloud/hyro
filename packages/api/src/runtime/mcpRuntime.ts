/**
 * MCP runtime — connects to MCP servers, performs the JSON‑RPC handshake, and proxies
 * `tools/list` / `tools/call`. Supports stdio (child process) and HTTP transports.
 *
 * Connections are established on demand. stdio servers run with a scrubbed environment
 * (only manifest‑declared keys are forwarded) when sandboxing is enabled.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { McpError, type McpServer, type McpToolSchema } from '@hyro/core';
import type { Config } from '../config';
import type { Logger } from '../logger';

const HANDSHAKE_TIMEOUT_MS = 20_000;
const CALL_TIMEOUT_MS = 60_000;
const PROTOCOL_VERSION = '2024-11-05';

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: unknown;
  error?: { code: number; message: string };
}

export class McpRuntime {
  constructor(
    private readonly config: Config,
    private readonly log: Logger,
  ) {}

  /** List tools exposed by a server (declared manifest tools, optionally live). */
  async listTools(server: McpServer): Promise<McpToolSchema[]> {
    if (server.tools.length) return server.tools;
    try {
      const conn = await this.connect(server);
      try {
        const result = (await conn.request('tools/list', {})) as { tools?: McpToolSchema[] };
        return result.tools ?? [];
      } finally {
        await conn.close();
      }
    } catch (err) {
      this.log.warn({ err, slug: server.slug }, 'Live MCP tool discovery failed');
      return [];
    }
  }

  /** Call a tool on a server and return its textual result. */
  async callTool(server: McpServer, toolName: string, args: Record<string, unknown>): Promise<string> {
    const conn = await this.connect(server);
    try {
      const result = (await conn.request('tools/call', { name: toolName, arguments: args })) as {
        content?: { type: string; text?: string }[];
        isError?: boolean;
      };
      const text = (result.content ?? [])
        .map((c) => (c.type === 'text' ? c.text ?? '' : `[${c.type}]`))
        .join('\n');
      if (result.isError) return `Tool error: ${text}`;
      return text || 'Tool returned no content.';
    } finally {
      await conn.close();
    }
  }

  private async connect(server: McpServer): Promise<McpConnection> {
    if (server.transport === 'http' || server.transport === 'sse') {
      if (!server.install.url) throw new McpError(`Server ${server.slug} has no URL`);
      return new HttpConnection(server.install.url);
    }
    if (!server.install.command) throw new McpError(`Server ${server.slug} has no command`);
    const env = this.buildEnv(server);
    const conn = new StdioConnection(server.install.command, server.install.args ?? [], env, this.log);
    await conn.initialize();
    return conn;
  }

  private buildEnv(server: McpServer): NodeJS.ProcessEnv {
    if (!this.config.mcpSandbox) return process.env;
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: process.env.HOME };
    for (const key of server.env) {
      if (process.env[key] !== undefined) env[key] = process.env[key];
    }
    return env;
  }
}

interface McpConnection {
  request(method: string, params: Record<string, unknown>): Promise<unknown>;
  close(): Promise<void>;
}

class HttpConnection implements McpConnection {
  private nextId = 1;
  constructor(private readonly url: string) {}

  async request(method: string, params: Record<string, unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: this.nextId++, method, params }),
        signal: controller.signal,
      });
      const json = (await res.json()) as JsonRpcResponse;
      if (json.error) throw new McpError(json.error.message, { code: json.error.code });
      return json.result;
    } catch (err) {
      if (err instanceof McpError) throw err;
      throw new McpError('HTTP MCP request failed', { cause: String(err) });
    } finally {
      clearTimeout(timer);
    }
  }

  async close(): Promise<void> {
    /* stateless */
  }
}

class StdioConnection implements McpConnection {
  private proc: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private buffer = '';
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private closed = false;

  constructor(
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv,
    private readonly log: Logger,
  ) {
    this.proc = spawn(command, args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (chunk: string) => this.onData(chunk));
    this.proc.on('error', (err) => this.failAll(new McpError('MCP process error', { cause: String(err) })));
    this.proc.on('exit', (code) => {
      if (!this.closed) this.failAll(new McpError(`MCP process exited (${code})`));
    });
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let nl: number;
    while ((nl = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, nl).trim();
      this.buffer = this.buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line) as JsonRpcResponse;
        if (typeof msg.id === 'number' && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) reject(new McpError(msg.error.message, { code: msg.error.code }));
          else resolve(msg.result);
        }
      } catch {
        /* ignore non‑JSON lines (server logging) */
      }
    }
  }

  private failAll(err: Error): void {
    for (const { reject } of this.pending.values()) reject(err);
    this.pending.clear();
  }

  private send(method: string, params: Record<string, unknown>, id?: number): void {
    const payload = JSON.stringify({ jsonrpc: '2.0', ...(id !== undefined ? { id } : {}), method, params });
    this.proc.stdin.write(payload + '\n');
  }

  request(method: string, params: Record<string, unknown>, timeoutMs = CALL_TIMEOUT_MS): Promise<unknown> {
    const id = this.nextId++;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new McpError(`MCP request '${method}' timed out`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.send(method, params, id);
    });
  }

  async initialize(): Promise<void> {
    await this.request(
      'initialize',
      {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        clientInfo: { name: 'hyro', version: '0.1.0' },
      },
      HANDSHAKE_TIMEOUT_MS,
    );
    this.send('notifications/initialized', {});
  }

  async close(): Promise<void> {
    this.closed = true;
    this.failAll(new McpError('connection closed'));
    this.proc.stdin.end();
    this.proc.kill();
  }
}
