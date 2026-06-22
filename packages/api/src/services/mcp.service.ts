import {
  NotFoundError,
  type AgentMcpGrant,
  type McpGrantInput,
  type McpInstallSpec,
  type McpServer,
  type McpToolSchema,
  type McpTransport,
} from '@hyro/core';
import type { AppContext } from '../context';
import { asArray, asObject, iso } from '../lib/row';

interface ServerRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  transport: McpTransport;
  install: Record<string, unknown>;
  env: string[] | null;
  tools: unknown;
  permissions: Record<string, unknown>;
  publisher: string | null;
  verified: boolean;
  installs: number;
  created_at: Date;
}

function mapServer(row: ServerRow): McpServer {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    transport: row.transport,
    install: asObject<McpInstallSpec>(row.install, {}),
    env: asArray<string>(row.env),
    tools: asArray<McpToolSchema>(row.tools),
    permissions: asObject(row.permissions, {}),
    publisher: row.publisher,
    verified: row.verified,
    installs: row.installs,
    createdAt: iso(row.created_at),
  };
}

export interface ResolvedMcpTool {
  server: McpServer;
  tool: McpToolSchema;
  exposedName: string;
}

export class McpService {
  constructor(private readonly ctx: AppContext) {}
  private get db() {
    return this.ctx.db;
  }

  private async assertAgentOwned(userId: string, agentId: string): Promise<void> {
    const row = await this.db.queryOne<{ user_id: string }>('SELECT user_id FROM agents WHERE id = $1', [
      agentId,
    ]);
    if (!row || row.user_id !== userId) throw new NotFoundError('Agent');
  }

  async registrySearch(q: string | undefined, limit: number): Promise<McpServer[]> {
    if (q) {
      const rows = await this.db.query<ServerRow>(
        `SELECT * FROM mcp_servers
         WHERE slug ILIKE $1 OR name ILIKE $1 OR description ILIKE $1
         ORDER BY verified DESC, installs DESC LIMIT $2`,
        [`%${q}%`, limit],
      );
      return rows.map(mapServer);
    }
    const rows = await this.db.query<ServerRow>(
      'SELECT * FROM mcp_servers ORDER BY verified DESC, installs DESC LIMIT $1',
      [limit],
    );
    return rows.map(mapServer);
  }

  async getBySlug(slug: string): Promise<McpServer> {
    const row = await this.db.queryOne<ServerRow>('SELECT * FROM mcp_servers WHERE slug = $1', [slug]);
    if (!row) throw new NotFoundError('MCP server');
    return mapServer(row);
  }

  async install(userId: string, slug: string): Promise<McpServer> {
    const server = await this.getBySlug(slug);
    await this.db.query(
      `INSERT INTO user_mcp_installs (user_id, mcp_server_id) VALUES ($1, $2)
       ON CONFLICT (user_id, mcp_server_id) DO UPDATE SET installed_at = now()`,
      [userId, server.id],
    );
    await this.db.query('UPDATE mcp_servers SET installs = installs + 1 WHERE id = $1', [server.id]);
    return { ...server, installs: server.installs + 1 };
  }

  async listInstalled(userId: string): Promise<McpServer[]> {
    const rows = await this.db.query<ServerRow>(
      `SELECT s.* FROM user_mcp_installs i JOIN mcp_servers s ON s.id = i.mcp_server_id
       WHERE i.user_id = $1 ORDER BY s.slug`,
      [userId],
    );
    return rows.map(mapServer);
  }

  async remove(userId: string, serverId: string): Promise<void> {
    const row = await this.db.queryOne(
      'DELETE FROM user_mcp_installs WHERE user_id = $1 AND mcp_server_id = $2 RETURNING mcp_server_id',
      [userId, serverId],
    );
    if (!row) throw new NotFoundError('Installed MCP server');
  }

  async tools(userId: string, serverId: string): Promise<McpToolSchema[]> {
    const row = await this.db.queryOne<ServerRow>('SELECT * FROM mcp_servers WHERE id = $1', [serverId]);
    if (!row) throw new NotFoundError('MCP server');
    const server = mapServer(row);
    return this.ctx.mcpRuntime.listTools(server);
  }

  async grant(userId: string, input: McpGrantInput): Promise<AgentMcpGrant> {
    await this.assertAgentOwned(userId, input.agentId);
    const server = await this.db.queryOne<{ id: string }>('SELECT id FROM mcp_servers WHERE id = $1', [
      input.serverId,
    ]);
    if (!server) throw new NotFoundError('MCP server');
    const row = await this.db.queryOne<{
      agent_id: string;
      mcp_server_id: string;
      allowed_tools: string[];
      granted_at: Date;
    }>(
      `INSERT INTO agent_mcp_grants (agent_id, mcp_server_id, allowed_tools)
       VALUES ($1, $2, $3::text[])
       ON CONFLICT (agent_id, mcp_server_id) DO UPDATE SET allowed_tools = $3::text[], granted_at = now()
       RETURNING *`,
      [input.agentId, input.serverId, input.allowedTools],
    );
    return {
      agentId: row!.agent_id,
      mcpServerId: row!.mcp_server_id,
      allowedTools: asArray<string>(row!.allowed_tools),
      grantedAt: iso(row!.granted_at),
    };
  }

  async grants(userId: string, agentId: string): Promise<AgentMcpGrant[]> {
    await this.assertAgentOwned(userId, agentId);
    const rows = await this.db.query<{
      agent_id: string;
      mcp_server_id: string;
      allowed_tools: string[];
      granted_at: Date;
    }>('SELECT * FROM agent_mcp_grants WHERE agent_id = $1', [agentId]);
    return rows.map((r) => ({
      agentId: r.agent_id,
      mcpServerId: r.mcp_server_id,
      allowedTools: asArray<string>(r.allowed_tools),
      grantedAt: iso(r.granted_at),
    }));
  }

  /** Resolve every MCP tool an agent is permitted to call, with routing metadata. */
  async getGrantedToolsForAgent(agentId: string): Promise<ResolvedMcpTool[]> {
    const rows = await this.db.query<ServerRow & { allowed_tools: string[] }>(
      `SELECT s.*, g.allowed_tools FROM agent_mcp_grants g
       JOIN mcp_servers s ON s.id = g.mcp_server_id WHERE g.agent_id = $1`,
      [agentId],
    );
    const resolved: ResolvedMcpTool[] = [];
    for (const row of rows) {
      const server = mapServer(row);
      const allowed = asArray<string>(row.allowed_tools);
      const all = allowed.includes('*');
      for (const tool of server.tools) {
        if (all || allowed.includes(tool.name)) {
          resolved.push({ server, tool, exposedName: `${server.slug}__${tool.name}` });
        }
      }
    }
    return resolved;
  }
}
