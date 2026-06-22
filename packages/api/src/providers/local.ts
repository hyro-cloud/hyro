import type { CompletionRequest, CompletionResult } from '@hyro/core';
import type { ModelProvider } from './types';
import { estimateTokens } from './shared';

/**
 * Deterministic offline provider. Used when no API key is configured for the target
 * provider, so HYRO works end‑to‑end without secrets (local dev, demos, tests). It
 * never calls tools; the agent loop still performs memory retrieval around it.
 */
export class LocalProvider implements ModelProvider {
  readonly id = 'local' as const;

  isAvailable(): boolean {
    return true;
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const task =
      [...req.messages].reverse().find((m) => m.role === 'user')?.content?.trim() ?? '';
    const memoryBlock = req.messages.find((m) => m.content.startsWith('# Memory'));
    const tools = req.tools?.map((t) => t.name) ?? [];

    const lines: string[] = [];
    lines.push('🜲 HYRO local runtime (offline) — deterministic response.');
    lines.push('');
    if (task) {
      const headline = task.length > 160 ? `${task.slice(0, 157)}…` : task;
      lines.push(`Task understood: ${headline}`);
    }
    lines.push('');
    lines.push('Plan:');
    lines.push('  1. Observe context and retrieve relevant memories.');
    lines.push('  2. Decide on the next action with the active model.');
    lines.push('  3. Execute tools via MCP where required.');
    lines.push('  4. Reflect and persist durable memory.');
    if (memoryBlock) {
      lines.push('');
      lines.push('Note: relevant memories were retrieved and considered.');
    }
    if (tools.length) {
      lines.push('');
      lines.push(`Tools available this step: ${tools.join(', ')}.`);
    }
    lines.push('');
    lines.push(
      'Connect a model provider (set ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY) to enable full reasoning and tool use.',
    );

    const text = lines.join('\n');
    const tokensIn = req.messages.reduce((acc, m) => acc + estimateTokens(m.content), 0);
    return {
      text,
      toolCalls: [],
      usage: { tokensIn, tokensOut: estimateTokens(text) },
      finishReason: 'stop',
    };
  }
}
