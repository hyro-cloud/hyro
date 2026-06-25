/**
 * Application context — the dependency container shared by every service and route.
 * Services receive the context and access siblings lazily, which keeps wiring simple
 * and avoids construction‑order cycles.
 */
import type { Config } from './config';
import type { Logger } from './logger';
import { Database } from './db/pool';
import { createStore, type KeyValueStore } from './redis';
import { ProviderRouter } from './providers/router';
import { McpRuntime } from './runtime/mcpRuntime';
import { EmbeddingService } from './services/embeddings';
import { AuthService } from './services/auth.service';
import { AgentService } from './services/agent.service';
import { MemoryService } from './services/memory.service';
import { McpService } from './services/mcp.service';
import { MarketplaceService } from './services/marketplace.service';
import { UsageService } from './services/usage.service';
import { RunService } from './services/run.service';
import { McpOAuthService } from './services/mcp-oauth.service';

export interface Services {
  auth: AuthService;
  agents: AgentService;
  memory: MemoryService;
  mcp: McpService;
  mcpOAuth: McpOAuthService;
  marketplace: MarketplaceService;
  usage: UsageService;
  runs: RunService;
}

export interface AppContext {
  config: Config;
  log: Logger;
  db: Database;
  store: KeyValueStore;
  providers: ProviderRouter;
  embeddings: EmbeddingService;
  mcpRuntime: McpRuntime;
  services: Services;
}

export function buildContext(config: Config, log: Logger): AppContext {
  const db = new Database(config, log);
  const store = createStore(config, log);
  const providers = new ProviderRouter(config, log);
  const embeddings = new EmbeddingService(config, log);
  const mcpRuntime = new McpRuntime(config, log);

  const ctx = { config, log, db, store, providers, embeddings, mcpRuntime } as AppContext;
  ctx.services = {
    auth: new AuthService(ctx),
    agents: new AgentService(ctx),
    memory: new MemoryService(ctx),
    mcp: new McpService(ctx),
    mcpOAuth: new McpOAuthService(ctx),
    marketplace: new MarketplaceService(ctx),
    usage: new UsageService(ctx),
    runs: new RunService(ctx),
  };
  return ctx;
}

export async function closeContext(ctx: AppContext): Promise<void> {
  await ctx.db.close().catch(() => undefined);
  await ctx.store.close().catch(() => undefined);
}
