import {
  getModel,
  ProviderError,
  type CompletionRequest,
  type CompletionResult,
  type ProviderId,
} from '@hyro/core';
import type { Config } from '../config';
import type { Logger } from '../logger';
import type { ModelProvider } from './types';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { LocalProvider } from './local';
import { createOpenAIProvider, createOpenRouterProvider } from './openaiCompatible';

export interface RoutedCompletion extends CompletionResult {
  model: string;
  provider: ProviderId;
}

/** Selects and invokes the right provider for a given model id. */
export class ProviderRouter {
  private readonly providers = new Map<ProviderId, ModelProvider>();

  constructor(
    private readonly config: Config,
    private readonly log: Logger,
  ) {
    this.providers.set('anthropic', new AnthropicProvider(config.providerKeys.anthropic));
    this.providers.set('openai', createOpenAIProvider(config.providerKeys.openai));
    this.providers.set('gemini', new GeminiProvider(config.providerKeys.gemini));
    this.providers.set('openrouter', createOpenRouterProvider(config.providerKeys.openrouter));
    this.providers.set('local', new LocalProvider());
  }

  async complete(req: CompletionRequest): Promise<RoutedCompletion> {
    const model = getModel(req.model);
    if (!model) throw new ProviderError(`Unknown model: ${req.model}`);
    if (model.embedding) throw new ProviderError(`${model.id} is an embedding model, not a chat model`);

    let providerId = model.provider;
    let provider = this.providers.get(providerId);
    if (!provider || !provider.isAvailable()) {
      this.log.warn(
        { model: model.id, provider: providerId },
        'Provider unavailable — falling back to local runtime',
      );
      providerId = 'local';
      provider = this.providers.get('local')!;
    }

    const result = await provider.complete({ ...req, model: model.id });
    return { ...result, model: model.id, provider: providerId };
  }

  isModelEnabled(modelId: string): boolean {
    const model = getModel(modelId);
    if (!model) return false;
    const provider = this.providers.get(model.provider);
    return Boolean(provider?.isAvailable());
  }

  availableProviders(): ProviderId[] {
    return [...this.providers.entries()].filter(([, p]) => p.isAvailable()).map(([id]) => id);
  }
}
