/**
 * Model registry — the single source of truth mapping a model id to its provider
 * and capabilities. The provider router (API) and the CLI both read from here.
 *
 * Prices are USD per 1M tokens and are indicative defaults; they can be overridden
 * per‑deployment. `aliases` let users type short names like `claude-sonnet` or `gpt-5`.
 */
import type { ProviderId } from './constants';

export interface ModelInfo {
  id: string;
  provider: ProviderId;
  label: string;
  /** Max input context window in tokens. */
  contextWindow: number;
  /** Max output tokens per response. */
  maxOutput: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  /** Pricing per 1M tokens, USD. */
  pricing: { inputPer1M: number; outputPer1M: number };
  /** Convenience aliases users may type. */
  aliases?: string[];
  /** Marks an embedding model (not a chat model). */
  embedding?: { dimension: number };
  description?: string;
}

const MODELS: ModelInfo[] = [
  // ---- Anthropic ----------------------------------------------------------
  {
    id: 'claude-opus-4-8',
    provider: 'anthropic',
    label: 'Claude Opus 4.8',
    contextWindow: 200_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    pricing: { inputPer1M: 15, outputPer1M: 75 },
    aliases: ['claude-opus', 'opus'],
    description: 'Most capable Claude model for deep reasoning and agentic work.',
  },
  {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    label: 'Claude Sonnet 4.6',
    contextWindow: 200_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    pricing: { inputPer1M: 3, outputPer1M: 15 },
    aliases: ['claude-sonnet', 'sonnet', 'claude'],
    description: 'Balanced speed and intelligence — the HYRO default.',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    label: 'Claude Haiku 4.5',
    contextWindow: 200_000,
    maxOutput: 32_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    pricing: { inputPer1M: 1, outputPer1M: 5 },
    aliases: ['claude-haiku', 'haiku'],
    description: 'Fast, low‑cost Claude for high‑volume agent steps.',
  },
  {
    id: 'claude-fable-5',
    provider: 'anthropic',
    label: 'Fable 5',
    contextWindow: 200_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    pricing: { inputPer1M: 5, outputPer1M: 25 },
    aliases: ['fable', 'fable-5'],
    description: 'Creative, expressive Claude family model.',
  },

  // ---- OpenAI -------------------------------------------------------------
  {
    id: 'gpt-5',
    provider: 'openai',
    label: 'GPT‑5',
    contextWindow: 256_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    pricing: { inputPer1M: 10, outputPer1M: 30 },
    aliases: ['gpt5'],
    description: 'OpenAI flagship reasoning model.',
  },
  {
    id: 'gpt-5-mini',
    provider: 'openai',
    label: 'GPT‑5 mini',
    contextWindow: 256_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    pricing: { inputPer1M: 1.5, outputPer1M: 6 },
    aliases: ['gpt5-mini'],
    description: 'Cost‑efficient GPT‑5 tier.',
  },
  {
    id: 'gpt-4.1',
    provider: 'openai',
    label: 'GPT‑4.1',
    contextWindow: 1_000_000,
    maxOutput: 32_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    pricing: { inputPer1M: 2, outputPer1M: 8 },
    description: 'Long‑context GPT‑4 class model.',
  },

  // ---- Google Gemini ------------------------------------------------------
  {
    id: 'gemini-2.5-pro',
    provider: 'gemini',
    label: 'Gemini 2.5 Pro',
    contextWindow: 1_000_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    pricing: { inputPer1M: 1.25, outputPer1M: 10 },
    aliases: ['gemini-pro', 'gemini'],
    description: 'Google long‑context multimodal model.',
  },
  {
    id: 'gemini-2.5-flash',
    provider: 'gemini',
    label: 'Gemini 2.5 Flash',
    contextWindow: 1_000_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    pricing: { inputPer1M: 0.3, outputPer1M: 2.5 },
    aliases: ['gemini-flash', 'flash'],
    description: 'Fast, cheap Gemini for high throughput.',
  },

  // ---- OpenRouter (proxied) ----------------------------------------------
  {
    id: 'openrouter/auto',
    provider: 'openrouter',
    label: 'OpenRouter Auto',
    contextWindow: 200_000,
    maxOutput: 32_000,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
    pricing: { inputPer1M: 0, outputPer1M: 0 },
    aliases: ['auto', 'or-auto'],
    description: 'Routes to the best available model via OpenRouter.',
  },
  {
    id: 'deepseek/deepseek-r1',
    provider: 'openrouter',
    label: 'DeepSeek R1',
    contextWindow: 128_000,
    maxOutput: 32_000,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
    pricing: { inputPer1M: 0.55, outputPer1M: 2.19 },
    aliases: ['deepseek-r1', 'r1'],
    description: 'Open reasoning model via OpenRouter.',
  },
  {
    id: 'meta-llama/llama-3.1-405b-instruct',
    provider: 'openrouter',
    label: 'Llama 3.1 405B',
    contextWindow: 128_000,
    maxOutput: 16_000,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
    pricing: { inputPer1M: 0.9, outputPer1M: 0.9 },
    aliases: ['llama-405b', 'llama'],
    description: 'Large open Llama model via OpenRouter.',
  },

  // ---- Xiaomi MiMo (OpenAI-compatible) ------------------------------------
  {
    id: 'mimo-chat',
    provider: 'mimo',
    label: 'Xiaomi MiMo',
    contextWindow: 128_000,
    maxOutput: 32_000,
    supportsTools: true,
    supportsVision: false,
    supportsStreaming: true,
    pricing: { inputPer1M: 0, outputPer1M: 0 },
    aliases: ['mimo', 'xiaomi-mimo', 'xiaomi'],
    description: 'Xiaomi MiMo via OpenAI-compatible API (token-plan endpoint).',
  },

  // ---- Embeddings ---------------------------------------------------------
  {
    id: 'local-minilm',
    provider: 'local',
    label: 'Local MiniLM (deterministic)',
    contextWindow: 8192,
    maxOutput: 0,
    supportsTools: false,
    supportsVision: false,
    supportsStreaming: false,
    pricing: { inputPer1M: 0, outputPer1M: 0 },
    embedding: { dimension: 1536 },
    description: 'Offline deterministic embedder — no API key required.',
  },
  {
    id: 'text-embedding-3-small',
    provider: 'openai',
    label: 'OpenAI text-embedding-3-small',
    contextWindow: 8192,
    maxOutput: 0,
    supportsTools: false,
    supportsVision: false,
    supportsStreaming: false,
    pricing: { inputPer1M: 0.02, outputPer1M: 0 },
    embedding: { dimension: 1536 },
    description: 'High‑quality, low‑cost OpenAI embeddings.',
  },
];

// Build lookup maps once.
const BY_ID = new Map<string, ModelInfo>();
const BY_ALIAS = new Map<string, string>();
for (const m of MODELS) {
  BY_ID.set(m.id, m);
  BY_ALIAS.set(m.id.toLowerCase(), m.id);
  for (const a of m.aliases ?? []) BY_ALIAS.set(a.toLowerCase(), m.id);
}

/** Resolve an alias or canonical id to a canonical model id (or undefined). */
export function resolveModelId(idOrAlias: string): string | undefined {
  return BY_ALIAS.get(idOrAlias.trim().toLowerCase());
}

/** Get full model info by id or alias. */
export function getModel(idOrAlias: string): ModelInfo | undefined {
  const id = resolveModelId(idOrAlias);
  return id ? BY_ID.get(id) : undefined;
}

/** All chat (non‑embedding) models. */
export function listChatModels(): ModelInfo[] {
  return MODELS.filter((m) => !m.embedding);
}

/** All embedding models. */
export function listEmbeddingModels(): ModelInfo[] {
  return MODELS.filter((m) => Boolean(m.embedding));
}

/** Every registered model. */
export function listModels(): ModelInfo[] {
  return [...MODELS];
}

export function isEmbeddingModel(idOrAlias: string): boolean {
  return Boolean(getModel(idOrAlias)?.embedding);
}

/** Estimate USD cost for a number of input/output tokens. */
export function estimateCost(model: ModelInfo, tokensIn: number, tokensOut: number): number {
  const cost =
    (tokensIn / 1_000_000) * model.pricing.inputPer1M +
    (tokensOut / 1_000_000) * model.pricing.outputPer1M;
  return Math.round(cost * 1e6) / 1e6;
}
