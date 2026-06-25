import type { CompletionRequest, CompletionResult, ProviderId, ToolCall } from '@hyro/core';
import type { ModelProvider } from './types';
import { extractSystem, fetchJson, normalizeConversation } from './shared';

interface OpenAIChoice {
  message?: {
    content?: string | null;
    tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[];
  };
  finish_reason?: string;
}

/**
 * Shared adapter for the OpenAI Chat Completions wire format, used by both OpenAI and
 * OpenRouter (which is API‑compatible).
 */
export class OpenAICompatibleProvider implements ModelProvider {
  constructor(
    readonly id: ProviderId,
    private readonly apiKey: string | undefined,
    private readonly endpoint: string,
    private readonly extraHeaders: Record<string, string> = {},
  ) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const system = extractSystem(req.messages);
    const conversation = normalizeConversation(req.messages);
    const messages = [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      ...conversation,
    ];

    const body = {
      model: req.model,
      messages,
      temperature: req.temperature ?? 0.7,
      ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
      ...(req.tools?.length
        ? {
            tools: req.tools.map((t) => ({
              type: 'function',
              function: { name: t.name, description: t.description, parameters: t.inputSchema },
            })),
            tool_choice: 'auto',
          }
        : {}),
    };

    const data = (await fetchJson(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey!}`,
        ...this.extraHeaders,
      },
      body: JSON.stringify(body),
    })) as {
      choices?: OpenAIChoice[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const choice = data.choices?.[0];
    const text = choice?.message?.content ?? '';
    const toolCalls: ToolCall[] = (choice?.message?.tool_calls ?? []).map((tc, i) => {
      let args: Record<string, unknown> = {};
      try {
        args = tc.function?.arguments ? (JSON.parse(tc.function.arguments) as Record<string, unknown>) : {};
      } catch {
        args = { _raw: tc.function?.arguments };
      }
      return { id: tc.id ?? `call_${i}`, name: tc.function?.name ?? 'unknown', arguments: args };
    });

    return {
      text,
      toolCalls,
      usage: {
        tokensIn: data.usage?.prompt_tokens ?? 0,
        tokensOut: data.usage?.completion_tokens ?? 0,
      },
      finishReason:
        choice?.finish_reason === 'tool_calls'
          ? 'tool_calls'
          : choice?.finish_reason === 'length'
            ? 'length'
            : 'stop',
    };
  }
}

export function createOpenAIProvider(apiKey: string | undefined): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider('openai', apiKey, 'https://api.openai.com/v1/chat/completions');
}

export function createOpenRouterProvider(apiKey: string | undefined): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider(
    'openrouter',
    apiKey,
    'https://openrouter.ai/api/v1/chat/completions',
    { 'HTTP-Referer': 'https://hyro.cloud', 'X-Title': 'HYRO Cloud' },
  );
}

/** Xiaomi MiMo — OpenAI-compatible chat completions at a custom base URL. */
export class MimoProvider implements ModelProvider {
  readonly id = 'mimo' as const;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly baseUrl: string,
  ) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const system = extractSystem(req.messages);
    const conversation = normalizeConversation(req.messages);
    const messages = [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      ...conversation,
    ];

    const body: Record<string, unknown> = {
      model: req.model,
      messages,
      temperature: req.temperature ?? 0.7,
      thinking: { type: 'disabled' },
      max_completion_tokens: req.maxTokens ?? 4096,
      ...(req.tools?.length
        ? {
            tools: req.tools.map((t) => ({
              type: 'function',
              function: { name: t.name, description: t.description, parameters: t.inputSchema },
            })),
            tool_choice: 'auto',
          }
        : {}),
    };

    const base = this.baseUrl.replace(/\/$/, '');
    const data = (await fetchJson(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey!}`,
        'api-key': this.apiKey!,
      },
      body: JSON.stringify(body),
    })) as {
      choices?: OpenAIChoice[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const choice = data.choices?.[0];
    const text = choice?.message?.content ?? '';
    const toolCalls: ToolCall[] = (choice?.message?.tool_calls ?? []).map((tc, i) => {
      let args: Record<string, unknown> = {};
      try {
        args = tc.function?.arguments ? (JSON.parse(tc.function.arguments) as Record<string, unknown>) : {};
      } catch {
        args = { _raw: tc.function?.arguments };
      }
      return { id: tc.id ?? `call_${i}`, name: tc.function?.name ?? 'unknown', arguments: args };
    });

    return {
      text,
      toolCalls,
      usage: {
        tokensIn: data.usage?.prompt_tokens ?? 0,
        tokensOut: data.usage?.completion_tokens ?? 0,
      },
      finishReason:
        choice?.finish_reason === 'tool_calls'
          ? 'tool_calls'
          : choice?.finish_reason === 'length'
            ? 'length'
            : 'stop',
    };
  }
}

export function createMimoProvider(
  apiKey: string | undefined,
  baseUrl: string,
): MimoProvider {
  return new MimoProvider(apiKey, baseUrl);
}
