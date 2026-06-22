import type { HyroClient } from '@hyro/sdk';
import type { McpServer } from '@hyro/core';
import { requireAuth } from '../api/client';
import { loadConfig } from '../config';
import { CliError, EXIT } from '../lib/errors';
import { emit } from '../lib/render';
import { print, success, table } from '../lib/output';
import { theme } from '../theme';

async function findInstalled(client: HyroClient, slug: string): Promise<McpServer> {
  const { servers } = await client.mcp.listInstalled();
  const server = servers.find((s) => s.slug === slug || s.id === slug);
  if (!server) {
    throw new CliError(
      `MCP server '${slug}' is not installed.`,
      EXIT.usage,
      `Install it: hyro mcp install ${slug}`,
    );
  }
  return server;
}

export interface McpCommandOptions {
  json?: boolean;
  agent?: string;
  tools?: string;
}

export async function runMcpCommand(
  sub: string | undefined,
  args: string[],
  opts: McpCommandOptions,
): Promise<void> {
  const client = requireAuth();
  const json = Boolean(opts.json);

  if (sub === 'search') {
    const q = args.join(' ').trim() || undefined;
    const { servers } = await client.mcp.registry(q, 25);
    emit(json, { servers }, () => {
      if (!servers.length) return void print(theme.dim('No servers found.'));
      print('');
      print(
        table(
          ['', 'slug', 'name', 'tools', 'description'],
          servers.map((s) => [
            s.verified ? theme.cyan('✓') : ' ',
            s.slug,
            s.name,
            String(s.tools.length),
            theme.dim((s.description ?? '').slice(0, 50)),
          ]),
        ),
      );
      print('');
    });
    return;
  }

  if (sub === 'install' || sub === 'add') {
    const slug = args[0];
    if (!slug) throw new CliError('Usage: hyro mcp install <slug>', EXIT.usage);
    const { server } = await client.mcp.install(slug);
    emit(json, { server }, () =>
      success(
        `Installed ${theme.bold(server.name)} (${server.tools.length} tools). Grant with \`hyro mcp grant ${slug}\`.`,
      ),
    );
    return;
  }

  if (sub === 'tools') {
    const slug = args[0];
    if (!slug) throw new CliError('Usage: hyro mcp tools <slug>', EXIT.usage);
    const server = await findInstalled(client, slug);
    const { tools } = await client.mcp.tools(server.id);
    emit(json, { tools }, () => {
      print('');
      for (const t of tools) {
        print(
          `  ${theme.amber(t.name)}${t.dangerous ? theme.red(' ⚠') : ''}  ${theme.dim(t.description ?? '')}`,
        );
      }
      print('');
    });
    return;
  }

  if (sub === 'grant') {
    const slug = args[0];
    if (!slug) throw new CliError('Usage: hyro mcp grant <slug> [--tools a,b | --tools *]', EXIT.usage);
    const ref = opts.agent || loadConfig().activeAgent;
    if (!ref) throw new CliError('No agent selected.', EXIT.usage, 'Set activeAgent in config.');
    const [{ agent }, server] = await Promise.all([
      client.agents.get(ref),
      findInstalled(client, slug),
    ]);
    const allowedTools = opts.tools
      ? opts.tools.split(',').map((s) => s.trim()).filter(Boolean)
      : ['*'];
    const { grant } = await client.mcp.grant({
      agentId: agent.id,
      serverId: server.id,
      allowedTools,
    });
    emit(json, { grant }, () =>
      success(
        `Granted ${theme.amber(allowedTools.join(', '))} from ${theme.bold(server.name)} to ${theme.bold(agent.slug)}.`,
      ),
    );
    return;
  }

  if (sub === 'remove' || sub === 'rm') {
    const slug = args[0];
    if (!slug) throw new CliError('Usage: hyro mcp remove <slug>', EXIT.usage);
    const server = await findInstalled(client, slug);
    await client.mcp.remove(server.id);
    success(`Removed ${slug}.`);
    return;
  }

  const { servers } = await client.mcp.listInstalled();
  emit(json, { servers }, () => {
    if (!servers.length) {
      return void print(theme.dim('No MCP servers installed. Try `hyro mcp search github`.'));
    }
    print('');
    print(
      table(
        ['slug', 'name', 'transport', 'tools'],
        servers.map((s) => [theme.amber(s.slug), s.name, theme.dim(s.transport), String(s.tools.length)]),
      ),
    );
    print('');
  });
}
