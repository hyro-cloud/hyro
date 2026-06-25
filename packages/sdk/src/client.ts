import type {
  Agent,
  AgentVersion,
  ApiKeyInfo,
  CreateAgentInput,
  CreateApiKeyInput,
  DeployAgentInput,
  MarketplaceListing,
  MarketplacePublishInput,
  MemoryExportItem,
  MemoryItem,
  MemorySearchInput,
  MemorySearchResult,
  MemoryUpsertInput,
  McpGrantInput,
  McpOAuthConnectionStatus,
  McpServer,
  McpToolSchema,
  AgentMcpGrant,
  ModelInfo,
  Paginated,
  RegisterInput,
  LoginInput,
  Run,
  RunInput,
  RunStep,
  Tokens,
  UpdateAgentInput,
  UsageEvent,
  UsageSummary,
  User,
} from '@hyro/core';
import { Http, type HttpOptions, type RequestOptions } from './http';

export interface HyroClientOptions extends Omit<HttpOptions, 'baseUrl'> {
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'http://localhost:8080';

export interface RunStreamEvent {
  type: string;
  step?: RunStep;
  run?: Run;
  raw: string;
}

/**
 * Typed client for the HYRO Cloud API. Resource methods are grouped:
 *   client.auth, client.agents, client.runs, client.memory,
 *   client.mcp, client.marketplace, client.models, client.usage
 */
export class HyroClient {
  private readonly http: Http;

  readonly auth: AuthResource;
  readonly agents: AgentsResource;
  readonly runs: RunsResource;
  readonly memory: MemoryResource;
  readonly mcp: McpResource;
  readonly marketplace: MarketplaceResource;
  readonly models: ModelsResource;
  readonly usage: UsageResource;

  constructor(options: HyroClientOptions = {}) {
    this.http = new Http({ ...options, baseUrl: options.baseUrl ?? DEFAULT_BASE_URL });
    this.auth = new AuthResource(this.http);
    this.agents = new AgentsResource(this.http);
    this.runs = new RunsResource(this.http);
    this.memory = new MemoryResource(this.http);
    this.mcp = new McpResource(this.http);
    this.marketplace = new MarketplaceResource(this.http);
    this.models = new ModelsResource(this.http);
    this.usage = new UsageResource(this.http);
  }

  /** Update the auth token used for subsequent requests. */
  setToken(token: string | null): void {
    this.http.setToken(token);
  }

  async health(): Promise<{ status: string }> {
    return this.http.request('/healthz');
  }

  async ready(): Promise<{ status: string; db: boolean; redis: boolean }> {
    return this.http.request('/readyz');
  }
}

class Resource {
  constructor(protected readonly http: Http) {}
}

// ---------------------------------------------------------------------------

class AuthResource extends Resource {
  register(input: RegisterInput): Promise<{ user: User; tokens: Tokens }> {
    return this.http.request('/v1/auth/register', { method: 'POST', body: input });
  }
  login(input: LoginInput): Promise<{ user: User; tokens: Tokens }> {
    return this.http.request('/v1/auth/login', { method: 'POST', body: input });
  }
  refresh(refreshToken: string): Promise<{ tokens: Tokens }> {
    return this.http.request('/v1/auth/refresh', { method: 'POST', body: { refreshToken } });
  }
  logout(refreshToken: string): Promise<void> {
    return this.http.request('/v1/auth/logout', { method: 'POST', body: { refreshToken }, expectEmpty: true });
  }
  me(): Promise<{ user: User }> {
    return this.http.request('/v1/auth/me');
  }
  createApiKey(input: CreateApiKeyInput): Promise<{ apiKey: ApiKeyInfo; secret: string }> {
    return this.http.request('/v1/auth/api-keys', { method: 'POST', body: input });
  }
  listApiKeys(): Promise<{ keys: ApiKeyInfo[] }> {
    return this.http.request('/v1/auth/api-keys');
  }
  revokeApiKey(id: string): Promise<void> {
    return this.http.request(`/v1/auth/api-keys/${id}`, { method: 'DELETE', expectEmpty: true });
  }
}

class AgentsResource extends Resource {
  list(params: { limit?: number; cursor?: string } = {}): Promise<Paginated<Agent>> {
    return this.http.request('/v1/agents', { query: params });
  }
  create(input: CreateAgentInput): Promise<{ agent: Agent }> {
    return this.http.request('/v1/agents', { method: 'POST', body: input });
  }
  get(id: string): Promise<{ agent: Agent }> {
    return this.http.request(`/v1/agents/${id}`);
  }
  update(id: string, input: UpdateAgentInput): Promise<{ agent: Agent }> {
    return this.http.request(`/v1/agents/${id}`, { method: 'PATCH', body: input });
  }
  remove(id: string): Promise<void> {
    return this.http.request(`/v1/agents/${id}`, { method: 'DELETE', expectEmpty: true });
  }
  deploy(id: string, input: DeployAgentInput = {}): Promise<{ version: AgentVersion }> {
    return this.http.request(`/v1/agents/${id}/deploy`, { method: 'POST', body: input });
  }
  versions(id: string): Promise<{ versions: AgentVersion[] }> {
    return this.http.request(`/v1/agents/${id}/versions`);
  }
}

class RunsResource extends Resource {
  create(input: RunInput): Promise<{ run: Run }> {
    return this.http.request('/v1/runs', { method: 'POST', body: input });
  }
  get(id: string): Promise<{ run: Run; steps: RunStep[] }> {
    return this.http.request(`/v1/runs/${id}`);
  }
  cancel(id: string): Promise<{ run: Run }> {
    return this.http.request(`/v1/runs/${id}/cancel`, { method: 'POST' });
  }
  list(
    params: { agentId?: string; status?: string; limit?: number; cursor?: string } = {},
  ): Promise<Paginated<Run>> {
    return this.http.request('/v1/runs', { query: params });
  }

  /** Stream run steps live over SSE. */
  async *stream(id: string, options: RequestOptions = {}): AsyncGenerator<RunStreamEvent> {
    for await (const evt of this.http.stream(`/v1/runs/${id}/stream`, options)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(evt.data);
      } catch {
        parsed = undefined;
      }
      const payload = parsed as { step?: RunStep; run?: Run } | undefined;
      yield { type: evt.event, step: payload?.step, run: payload?.run, raw: evt.data };
      if (evt.event === 'done') break;
    }
  }
}

class MemoryResource extends Resource {
  add(input: MemoryUpsertInput): Promise<{ item: MemoryItem }> {
    return this.http.request('/v1/memory', { method: 'POST', body: input });
  }
  search(input: MemorySearchInput): Promise<{ results: MemorySearchResult[] }> {
    return this.http.request('/v1/memory/search', { method: 'POST', body: input });
  }
  list(
    params: { agentId: string; type?: string; limit?: number; cursor?: string },
  ): Promise<Paginated<MemoryItem>> {
    return this.http.request('/v1/memory', { query: params });
  }
  remove(id: string): Promise<void> {
    return this.http.request(`/v1/memory/${id}`, { method: 'DELETE', expectEmpty: true });
  }
  export(agentId: string): Promise<{ items: MemoryExportItem[] }> {
    return this.http.request('/v1/memory/export', { method: 'POST', body: { agentId } });
  }
  import(agentId: string, items: MemoryExportItem[]): Promise<{ imported: number }> {
    return this.http.request('/v1/memory/import', { method: 'POST', body: { agentId, items } });
  }
}

class McpResource extends Resource {
  registry(q?: string, limit?: number): Promise<{ servers: McpServer[] }> {
    return this.http.request('/v1/mcp/registry', { query: { q, limit } });
  }
  install(slug: string): Promise<{ server: McpServer }> {
    return this.http.request('/v1/mcp/install', { method: 'POST', body: { slug } });
  }
  listInstalled(): Promise<{ servers: McpServer[] }> {
    return this.http.request('/v1/mcp');
  }
  remove(id: string): Promise<void> {
    return this.http.request(`/v1/mcp/${id}`, { method: 'DELETE', expectEmpty: true });
  }
  tools(id: string): Promise<{ tools: McpToolSchema[] }> {
    return this.http.request(`/v1/mcp/${id}/tools`);
  }
  grant(input: McpGrantInput): Promise<{ grant: AgentMcpGrant }> {
    return this.http.request('/v1/mcp/grants', { method: 'POST', body: input });
  }
  grants(agentId: string): Promise<{ grants: AgentMcpGrant[] }> {
    return this.http.request('/v1/mcp/grants', { query: { agentId } });
  }
  oauthStart(slug: string): Promise<{ authorizeUrl: string; state: string }> {
    return this.http.request(`/v1/mcp/oauth/${slug}/start`, { method: 'POST' });
  }
  oauthStatus(slug: string): Promise<McpOAuthConnectionStatus> {
    return this.http.request(`/v1/mcp/oauth/${slug}/status`);
  }
  oauthDisconnect(slug: string): Promise<{ ok: boolean }> {
    return this.http.request(`/v1/mcp/oauth/${slug}`, { method: 'DELETE' });
  }
}

class MarketplaceResource extends Resource {
  list(
    params: { q?: string; category?: string; limit?: number; cursor?: string } = {},
  ): Promise<Paginated<MarketplaceListing>> {
    return this.http.request('/v1/marketplace', { query: params });
  }
  get(slug: string): Promise<{ listing: MarketplaceListing }> {
    return this.http.request(`/v1/marketplace/${slug}`);
  }
  publish(input: MarketplacePublishInput): Promise<{ listing: MarketplaceListing }> {
    return this.http.request('/v1/marketplace/publish', { method: 'POST', body: input });
  }
  install(slug: string): Promise<{ agent: Agent }> {
    return this.http.request(`/v1/marketplace/${slug}/install`, { method: 'POST' });
  }
}

class ModelsResource extends Resource {
  list(): Promise<{ models: (ModelInfo & { enabled: boolean })[] }> {
    return this.http.request('/v1/models');
  }
  setDefault(model: string): Promise<{ user: User }> {
    return this.http.request('/v1/models/default', { method: 'POST', body: { model } });
  }
}

class UsageResource extends Resource {
  summary(params: { from?: string; to?: string } = {}): Promise<UsageSummary> {
    return this.http.request('/v1/usage/summary', { query: params });
  }
  events(params: { limit?: number; cursor?: string } = {}): Promise<Paginated<UsageEvent>> {
    return this.http.request('/v1/usage/events', { query: params });
  }
}
