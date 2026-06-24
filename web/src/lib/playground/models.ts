export type ModelTier = 'flagship' | 'fast' | 'code' | 'auto';

export interface ModelProvider {
  key: string;
  label: string;
  /** Short line under provider name */
  blurb?: string;
}

export interface PlaygroundModel {
  id: string;
  label: string;
  providerKey: string;
  tag?: string;
  tier?: ModelTier;
  /** MiMo models — shown in the hero strip */
  featured?: boolean;
}

export const MODEL_PROVIDERS: ModelProvider[] = [
  { key: 'mimo', label: 'MiMo', blurb: 'HYRO default · VPS brain' },
  { key: 'anthropic', label: 'Anthropic' },
  { key: 'openai', label: 'OpenAI' },
  { key: 'google', label: 'Google' },
  { key: 'xai', label: 'xAI' },
  { key: 'deepseek', label: 'DeepSeek' },
  { key: 'moonshot', label: 'Moonshot' },
  { key: 'alibaba', label: 'Alibaba' },
  { key: 'zai', label: 'Z.ai' },
];

export const PLAYGROUND_MODELS: PlaygroundModel[] = [
  // MiMo — primary
  {
    id: 'mimo-2.5-pro',
    label: 'Mimo 2.5 Pro',
    providerKey: 'mimo',
    tag: 'NEW · HYRO VPS',
    tier: 'flagship',
    featured: true,
  },
  // Anthropic
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', providerKey: 'anthropic', tier: 'flagship' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', providerKey: 'anthropic', tier: 'fast' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', providerKey: 'anthropic', tier: 'flagship' },
  // OpenAI
  { id: 'gpt-5.4', label: 'GPT-5.4', providerKey: 'openai', tier: 'flagship' },
  { id: 'gpt-5-nano', label: 'GPT-5 Nano', providerKey: 'openai', tier: 'fast' },
  { id: 'gpt-5.2-codex', label: 'GPT-5.2 Codex', providerKey: 'openai', tier: 'code' },
  // Google
  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', providerKey: 'google', tier: 'flagship' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash', providerKey: 'google', tier: 'fast' },
  // xAI
  { id: 'grok-4.20', label: 'Grok 4.20', providerKey: 'xai', tier: 'flagship' },
  { id: 'grok-4.1-fast', label: 'Grok 4.1 Fast', providerKey: 'xai', tier: 'fast' },
  // DeepSeek
  { id: 'deepseek-v3.2', label: 'DeepSeek V3.2', providerKey: 'deepseek', tier: 'flagship' },
  // Moonshot
  { id: 'kimi-k2.7-code', label: 'Kimi K2.7 Code', providerKey: 'moonshot', tier: 'code' },
  { id: 'kimi-k2.6', label: 'Kimi K2.6', providerKey: 'moonshot', tier: 'flagship' },
  // Alibaba
  { id: 'qwen3-coder', label: 'Qwen3 Coder', providerKey: 'alibaba', tier: 'code' },
  { id: 'qwen3.7-plus', label: 'Qwen3.7 Plus', providerKey: 'alibaba', tier: 'flagship' },
  { id: 'qwen3.6-flash', label: 'Qwen3.6 Flash', providerKey: 'alibaba', tier: 'fast' },
  // Z.ai
  { id: 'glm-5.1', label: 'GLM-5.1', providerKey: 'zai', tier: 'flagship' },
  { id: 'glm-5-turbo', label: 'GLM-5 Turbo', providerKey: 'zai', tier: 'fast' },
];

export const DEFAULT_MODEL_ID = 'mimo-2.5-pro';

export function getModel(id: string): PlaygroundModel | undefined {
  return PLAYGROUND_MODELS.find((m) => m.id === id);
}

export function providerLabel(key: string): string {
  return MODEL_PROVIDERS.find((p) => p.key === key)?.label ?? key;
}

export function modelLabel(id: string): string {
  const m = getModel(id);
  if (!m) return id;
  return `${providerLabel(m.providerKey)} · ${m.label}`;
}

export function modelShortLabel(id: string): string {
  return getModel(id)?.label ?? id;
}

/** Group models by provider — MiMo first */
export function modelsGrouped(): { provider: ModelProvider; models: PlaygroundModel[] }[] {
  return MODEL_PROVIDERS.map((provider) => ({
    provider,
    models: PLAYGROUND_MODELS.filter((m) => m.providerKey === provider.key),
  })).filter((g) => g.models.length > 0);
}

export function featuredMimoModels(): PlaygroundModel[] {
  return PLAYGROUND_MODELS.filter((m) => m.featured);
}

export function otherProviderKeys(): string[] {
  return MODEL_PROVIDERS.map((p) => p.key).filter((k) => k !== 'mimo');
}

const TIER_LABEL: Record<ModelTier, string> = {
  flagship: 'Flagship',
  fast: 'Fast',
  code: 'Code',
  auto: 'Auto',
};

export function tierLabel(tier?: ModelTier): string | undefined {
  return tier ? TIER_LABEL[tier] : undefined;
}
