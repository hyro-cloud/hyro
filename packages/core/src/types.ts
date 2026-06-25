/** Domain entity types shared across packages. Timestamps are ISO‑8601 strings. */
import type {
  MarketplaceCategory,
  McpTransport,
  MemoryType,
  Plan,
  RunStatus,
  RunStepType,
  Scope,
  UsageKind,
  Visibility,
} from './constants';

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

// ---------------------------------------------------------------------------
// Identity & auth
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  defaultModel: string;
  plan: Plan;
  createdAt: string;
  updatedAt: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  /** Visible prefix, e.g. `hyro_sk_AbC1`. */
  prefix: string;
  scopes: Scope[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** Resolved caller identity attached to every authenticated request. */
export interface Principal {
  userId: string;
  scopes: Scope[];
  /** Present when authenticated via an API key. */
  keyId: string | null;
  /** 'session' (JWT) or 'api_key'. */
  via: 'session' | 'api_key';
}

// ---------------------------------------------------------------------------
// Agents & runs
// ---------------------------------------------------------------------------

export interface AgentConfig {
  temperature: number;
  maxSteps: number;
  memoryScope: 'agent' | 'user';
  memoryTopK: number;
  /** Optional list of built‑in tool ids enabled for the agent. */
  tools: string[];
}

export interface Agent {
  id: string;
  userId: string;
  slug: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  model: string;
  config: AgentConfig;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}

export interface AgentManifest {
  name: string;
  description: string | null;
  systemPrompt: string;
  model: string;
  config: AgentConfig;
  /** MCP servers + tools the agent expects. */
  mcp: { slug: string; tools: string[] }[];
}

export interface AgentVersion {
  id: string;
  agentId: string;
  version: string;
  manifest: AgentManifest;
  readme: string | null;
  createdAt: string;
}

export interface RunUsage {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  steps: number;
}

export interface Run {
  id: string;
  agentId: string;
  userId: string;
  status: RunStatus;
  model: string;
  input: JsonObject;
  output: JsonObject | null;
  error: string | null;
  usage: RunUsage;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface RunStep {
  id: string;
  runId: string;
  idx: number;
  type: RunStepType;
  content: JsonObject;
  tokens: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export interface MemoryItem {
  id: string;
  agentId: string;
  userId: string;
  type: MemoryType;
  content: string;
  metadata: JsonObject;
  importance: number;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
}

export interface MemorySearchResult {
  id: string;
  type: MemoryType;
  content: string;
  metadata: JsonObject;
  importance: number;
  score: number;
}

/** Portable export line (JSONL). */
export interface MemoryExportItem {
  type: MemoryType;
  content: string;
  metadata: JsonObject;
  importance: number;
}

// ---------------------------------------------------------------------------
// MCP
// ---------------------------------------------------------------------------

export interface McpToolSchema {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  dangerous?: boolean;
}

export interface McpInstallSpec {
  command?: string;
  args?: string[];
  url?: string;
}

export interface McpServer {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  transport: McpTransport;
  install: McpInstallSpec;
  env: string[];
  tools: McpToolSchema[];
  permissions: JsonObject;
  publisher: string | null;
  verified: boolean;
  installs: number;
  createdAt: string;
}

export interface AgentMcpGrant {
  agentId: string;
  mcpServerId: string;
  /** Tool names allowed; `['*']` means all. */
  allowedTools: string[];
  grantedAt: string;
}

/** Stored encrypted in `user_mcp_installs.env` for OAuth MCP servers. */
export interface McpOAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
}

export interface McpOAuthConnectionStatus {
  slug: string;
  connected: boolean;
  expiresAt: string | null;
  connectedAt: string | null;
  toolCount: number;
  authorizeUrl?: string;
}

// ---------------------------------------------------------------------------
// Marketplace
// ---------------------------------------------------------------------------

export interface MarketplaceListing {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: MarketplaceCategory;
  tags: string[];
  installs: number;
  rating: number;
  publishedBy: string;
  agentVersionId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export interface UsageEvent {
  id: string;
  userId: string;
  agentId: string | null;
  runId: string | null;
  kind: UsageKind;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  createdAt: string;
}

export interface UsageSummary {
  totals: { tokensIn: number; tokensOut: number; costUsd: number; runs: number };
  byDay: { date: string; tokensIn: number; tokensOut: number; costUsd: number }[];
  byModel: { model: string; tokensIn: number; tokensOut: number; costUsd: number }[];
}

// ---------------------------------------------------------------------------
// Provider abstraction (chat completion)
// ---------------------------------------------------------------------------

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** For role === 'tool': which tool produced this content. */
  toolName?: string;
  toolCallId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResult {
  /** Assistant text, if any. */
  text: string;
  /** Tool calls requested by the model, if any. */
  toolCalls: ToolCall[];
  usage: { tokensIn: number; tokensOut: number };
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}
