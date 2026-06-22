import { ProviderError, type ChatMessage } from '@hyro/core';

/** Extract and join all system messages into a single system prompt. */
export function extractSystem(messages: ChatMessage[]): string {
  return messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n')
    .trim();
}

/**
 * Normalize the conversation for providers that only accept user/assistant text:
 * tool results become labelled user observations, then adjacent same‑role messages
 * are merged so role alternation is preserved.
 */
export function normalizeConversation(
  messages: ChatMessage[],
): { role: 'user' | 'assistant'; content: string }[] {
  const mapped = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content:
        m.role === 'tool'
          ? `Observation from tool \`${m.toolName ?? 'tool'}\`:\n${m.content}`
          : m.content,
    }));

  const merged: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const msg of mapped) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) last.content += `\n\n${msg.content}`;
    else merged.push({ ...msg });
  }
  // Providers that require alternation also require the first turn to be a user turn.
  if (merged.length && merged[0]!.role === 'assistant') {
    merged.unshift({ role: 'user', content: '(continue)' });
  }
  return merged;
}

/** Approximate token count (~4 chars/token) — used for usage when a provider omits it. */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

const DEFAULT_TIMEOUT_MS = 120_000;

export async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } catch (cause) {
    throw new ProviderError('Failed to reach model provider', { cause: String(cause) });
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new ProviderError(`Provider returned ${res.status}`, {
      status: res.status,
      body: json,
    });
  }
  return json;
}
