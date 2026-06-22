import type { CompletionRequest, CompletionResult, ToolCall } from '@hyro/core';
import type { ModelProvider } from './types';
import { extractSystem, fetchJson, normalizeConversation } from './shared';

export class GeminiProvider implements ModelProvider {
  readonly id = 'gemini' as const;
  constructor(private readonly apiKey: string | undefined) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const system = extractSystem(req.messages);
    const contents = normalizeConversation(req.messages).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body = {
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents,
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        ...(req.maxTokens ? { maxOutputTokens: req.maxTokens } : {}),
      },
      ...(req.tools?.length
        ? {
            tools: [
              {
                functionDeclarations: req.tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  parameters: t.inputSchema,
                })),
              },
            ],
          }
        : {}),
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      req.model,
    )}:generateContent?key=${this.apiKey!}`;

    const data = (await fetchJson(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })) as {
      candidates?: {
        content?: { parts?: { text?: string; functionCall?: { name?: string; args?: unknown } }[] };
        finishReason?: string;
      }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    let text = '';
    const toolCalls: ToolCall[] = [];
    for (const part of parts) {
      if (part.text) text += part.text;
      else if (part.functionCall?.name) {
        toolCalls.push({
          id: `call_${toolCalls.length}`,
          name: part.functionCall.name,
          arguments: (part.functionCall.args as Record<string, unknown>) ?? {},
        });
      }
    }

    return {
      text,
      toolCalls,
      usage: {
        tokensIn: data.usageMetadata?.promptTokenCount ?? 0,
        tokensOut: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
      finishReason: toolCalls.length ? 'tool_calls' : 'stop',
    };
  }
}
