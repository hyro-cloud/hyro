/** Domain constants and the union types derived from them. */

export const SCOPES = [
  'agents:read',
  'agents:write',
  'runs:execute',
  'memory:read',
  'memory:write',
  'mcp:manage',
  'marketplace:publish',
] as const;
export type Scope = (typeof SCOPES)[number];
export const ALL_SCOPES: readonly Scope[] = SCOPES;

export const MEMORY_TYPES = ['fact', 'goal', 'preference', 'conversation', 'state'] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];

export const RUN_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const RUN_STEP_TYPES = [
  'observe',
  'decide',
  'tool_call',
  'tool_result',
  'final',
  'error',
] as const;
export type RunStepType = (typeof RUN_STEP_TYPES)[number];

export const VISIBILITIES = ['private', 'unlisted', 'public'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const PLANS = ['free', 'pro', 'team'] as const;
export type Plan = (typeof PLANS)[number];

export const MCP_TRANSPORTS = ['stdio', 'http', 'sse'] as const;
export type McpTransport = (typeof MCP_TRANSPORTS)[number];

export const PROVIDERS = ['anthropic', 'openai', 'gemini', 'openrouter', 'mimo', 'local'] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export const USAGE_KINDS = ['model', 'tool', 'embedding'] as const;
export type UsageKind = (typeof USAGE_KINDS)[number];

export const MARKETPLACE_CATEGORIES = [
  'research',
  'crypto',
  'growth',
  'trading',
  'builder',
  'productivity',
  'data',
  'other',
] as const;
export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

/** Engine‑wide defaults; mirror docs and .env.example. */
export const DEFAULTS = {
  model: 'claude-sonnet-4-6',
  embeddingModel: 'local-minilm',
  embeddingDim: 1536,
  maxSteps: 12,
  temperature: 0.7,
  memoryTopK: 8,
  memoryScope: 'agent' as 'agent' | 'user',
  pageLimit: 20,
  maxPageLimit: 100,
  accessTokenTtlSeconds: 60 * 30, // 30 min
  refreshTokenTtlSeconds: 60 * 60 * 24 * 30, // 30 days
} as const;

export const HEADERS = {
  requestId: 'x-request-id',
  idempotencyKey: 'idempotency-key',
} as const;

export const API_KEY_PREFIX = 'hyro_sk_';
export const API_VERSION = 'v1';

/** The HYRO mantra, shown on CLI launch. */
export const MANTRA = ['Observe.', 'Decide.', 'Execute.', 'Remember.'] as const;
