/**
 * Wire dashboard CONNECTED SOURCES to real MCP installs on the VPS.
 */
import type { HyroClient } from '@hyro/sdk';
import { activeToken } from '../config';
import { getClient, requireAuth } from '../api/client';
import { resolveAgent } from './agent';
import { DATA_SOURCES, type DataSource, loadWorkspace, toggleSource } from './workspace';

/** MCP registry slug for each dashboard source key (undefined = not shipped yet). */
export const SOURCE_MCP_SLUG: Record<string, string | undefined> = {
  base: 'base',
  coingecko: undefined,
  dexscreener: 'dexscreener',
  github: 'github',
  http: 'http',
  hyperliquid: undefined,
};

/** Free MCP servers with no API key — auto-installed on dashboard when logged in. */
export const FREE_AUTO_CONNECT = ['dexscreener', 'http'] as const;

export async function fetchInstalledMcpSlugs(): Promise<Set<string>> {
  if (!activeToken()) return new Set();
  try {
    const { servers } = await getClient().mcp.listInstalled();
    return new Set(servers.map((s) => s.slug));
  } catch {
    return new Set();
  }
}

/** True when the source is live for the agent (installed MCP or built-in). */
export function isSourceConnected(
  source: DataSource,
  installed: Set<string>,
  hasToken: boolean,
): boolean {
  if (source.local) return true;
  if (source.comingSoon) return false;

  const slug = SOURCE_MCP_SLUG[source.key];
  if (slug) return installed.has(slug);

  // Legacy local toggle fallback when offline
  if (!hasToken) return loadWorkspace().sources.includes(source.key);
  return false;
}

export async function resolveConnectedSources(hasToken: boolean): Promise<Set<string>> {
  const installed = hasToken ? await fetchInstalledMcpSlugs() : new Set<string>();
  const connected = new Set<string>();
  for (const s of DATA_SOURCES) {
    if (isSourceConnected(s, installed, hasToken)) connected.add(s.key);
  }
  return connected;
}

async function ensureInstalled(client: HyroClient, slug: string): Promise<void> {
  const { servers } = await client.mcp.listInstalled();
  if (servers.some((s) => s.slug === slug)) return;
  await client.mcp.install(slug);
}

async function ensureGranted(client: HyroClient, slug: string, agentRef?: string): Promise<void> {
  const agent = await resolveAgent(client, agentRef);
  const { servers } = await client.mcp.listInstalled();
  const server = servers.find((s) => s.slug === slug);
  if (!server) return;

  const { grants } = await client.mcp.grants(agent.id);
  if (grants.some((g) => g.mcpServerId === server.id)) return;

  await client.mcp.grant({ agentId: agent.id, serverId: server.id, allowedTools: ['*'] });
}

/** Install + grant an MCP-backed source for the active agent. */
export async function connectMcpSource(key: string): Promise<void> {
  const source = DATA_SOURCES.find((s) => s.key === key);
  if (!source) throw new Error(`Unknown source: ${key}`);
  if (source.local) return;
  if (source.comingSoon) {
    throw new Error(`${source.label} is not available yet — coming in a future HYRO release.`);
  }

  const slug = SOURCE_MCP_SLUG[key];
  if (!slug) throw new Error(`${source.label} is not available yet.`);

  const client = requireAuth();
  await ensureInstalled(client, slug);
  await ensureGranted(client, slug);
  toggleSource(key, true);
}

export async function disconnectMcpSource(key: string): Promise<void> {
  const slug = SOURCE_MCP_SLUG[key];
  toggleSource(key, false);
  if (!slug || !activeToken()) return;

  try {
    const client = requireAuth();
    const { servers } = await client.mcp.listInstalled();
    const server = servers.find((s) => s.slug === slug);
    if (server) await client.mcp.remove(server.id);
  } catch {
    /* offline or already removed */
  }
}

/** Auto-install free public MCP servers (DexScreener, HTTP) for the HYRO agent. */
export async function autoConnectFreeSources(): Promise<string[]> {
  const failures: string[] = [];
  if (!activeToken()) return failures;

  const client = requireAuth();
  for (const slug of FREE_AUTO_CONNECT) {
    try {
      await ensureInstalled(client, slug);
      await ensureGranted(client, slug);
      const key = Object.entries(SOURCE_MCP_SLUG).find(([, s]) => s === slug)?.[0];
      if (key) toggleSource(key, true);
    } catch (err) {
      failures.push(`${slug}: ${(err as Error).message}`);
    }
  }
  return failures;
}
