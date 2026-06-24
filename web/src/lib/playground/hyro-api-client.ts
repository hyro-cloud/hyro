import { SITE } from '@/lib/content';

const API = process.env.HYRO_API_URL || SITE.apiUrl;

export interface PlaygroundChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** Stream chat via Next.js API → MiMo on VPS */
export async function streamPlaygroundChat(
  messages: PlaygroundChatMessage[],
  modelId: string,
  onChunk: (text: string) => void,
): Promise<string> {
  const res = await fetch('/api/playground/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, modelId }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Chat API ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    const data = (await res.json()) as { content?: string };
    const text = data.content ?? '';
    onChunk(text);
    return text;
  }

  const decoder = new TextDecoder();
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload) as { content?: string };
        if (json.content) {
          full += json.content;
          onChunk(full);
        }
      } catch {
        /* skip malformed sse */
      }
    }
  }
  return full;
}

/** Execute a Base / DexScreener MCP skill on the server (real RPC / API). */
export async function runPlaygroundSkill(
  server: 'base' | 'dexscreener',
  tool: string,
  args: Record<string, string>,
): Promise<string> {
  const res = await fetch('/api/playground/tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ server, tool, args }),
  });
  const data = (await res.json()) as { result?: string; error?: string };
  if (!res.ok) throw new Error(data.error || `Tool failed (${res.status})`);
  return data.result ?? '';
}

export async function fetchApiHealth(): Promise<{ ok: boolean; api: string }> {
  try {
    const res = await fetch(`${API}/readyz`, { cache: 'no-store' });
    return { ok: res.ok, api: API };
  } catch {
    return { ok: false, api: API };
  }
}
