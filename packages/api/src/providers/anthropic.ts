import type { CompletionRequest, CompletionResult, ToolCall } from '@hyro/core';
import type { ModelProvider } from './types';
import { extractSystem, fetchJson, normalizeConversation } from './shared';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const VERSION = '2023-06-01';

export class AnthropicProvider implements ModelProvider {
  readonly id = 'anthropic' as const;
  constructor(private readonly apiKey: string | undefined) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const system = extractSystem(req.messages);
    const messages = normalizeConversation(req.messages);
    const body = {
      model: req.model,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages,
      ...(req.tools?.length
        ? {
            tools: req.tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.inputSchema,
            })),
          }
        : {}),
    };

    const data = (await fetchJson(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey!,
        'anthropic-version': VERSION,
      },
      body: JSON.stringify(body),
    })) as {
      content?: { type: string; text?: string; id?: string; name?: string; input?: unknown }[];
      usage?: { input_tokens?: number; output_tokens?: number };
      stop_reason?: string;
    };

    let text = '';
    const toolCalls: ToolCall[] = [];
    for (const block of data.content ?? []) {
      if (block.type === 'text' && block.text) text += block.text;
      else if (block.type === 'tool_use' && block.name) {
        toolCalls.push({
          id: block.id ?? `call_${toolCalls.length}`,
          name: block.name,
          arguments: (block.input as Record<string, unknown>) ?? {},
        });
      }
    }

    return {
      text,
      toolCalls,
      usage: {
        tokensIn: data.usage?.input_tokens ?? 0,
        tokensOut: data.usage?.output_tokens ?? 0,
      },
      finishReason:
        data.stop_reason === 'tool_use'
          ? 'tool_calls'
          : data.stop_reason === 'max_tokens'
            ? 'length'
            : 'stop',
    };
  }
}
