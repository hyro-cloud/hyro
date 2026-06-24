import { SITE } from '@/lib/content';
import { HYRO_AGENT_SYSTEM_PROMPT } from '@/lib/hyro-prompt';
import { skillById, skillChatPrefix, type BaseMcpSkill } from '@/lib/playground/base-mcp-skills';
import { runPlaygroundSkill, streamPlaygroundChat } from '@/lib/playground/hyro-api-client';
import type { ChatMessage, MemoryItem } from '@/lib/playground/types';
import { modelLabel } from '@/lib/playground/models';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function searchMemory(query: string, items: MemoryItem[], k = 3): MemoryItem[] {
  const q = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  return items
    .map((m) => {
      const text = m.content.toLowerCase();
      let score = 0;
      for (const w of q) if (text.includes(w)) score += 1;
      if (text.includes(query.toLowerCase())) score += 1.5;
      return { item: m, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((r) => r.item);
}

/** Parse `[skill:id]` prefix inserted when user clicks a Base MCP skill card */
export function parseSkillInvocation(text: string): { skill: BaseMcpSkill; cleanText: string } | null {
  const tag = text.match(/^\[skill:([a-z0-9-]+)\]\s*/i);
  if (tag) {
    const skill = skillById(tag[1]);
    if (skill) return { skill, cleanText: text.slice(tag[0].length).trim() || skill.chatInsert };
  }
  return null;
}

async function tryRunSkill(skill: BaseMcpSkill, userText: string): Promise<string | null> {
  if (skill.chatOnly || !skill.tools[0]) {
    return [
      `**${skill.title}** · \`${skill.toolLabel}\``,
      '',
      '_This prompt uses **official Base MCP** (mcp.base.org). Connect Base MCP in Cursor or HYRO CLI, then send this message._',
      '',
      `> ${skill.chatInsert}`,
      '',
      `Install: ${SITE.baseMcpQuickstart ?? 'https://docs.base.org/agents/quickstart'}`,
    ].join('\n');
  }

  const tool = skill.tools[0];
  const args = { ...skill.defaultArgs };

  const addrs = userText.match(/0x[a-fA-F0-9]{40}/g) ?? [];
  if ((tool === 'get_balance' || tool === 'get_usdc_balance') && addrs[0]) args.address = addrs[0];
  if (tool === 'get_token_balance') {
    if (addrs[0]) args.token = addrs[0];
    if (addrs[1]) args.address = addrs[1];
    else if (addrs[0] && !args.address) args.address = addrs[0];
  }
  if (tool === 'send_transaction' && addrs[0]) args.to = addrs[0];

  const quoted = userText.match(/"([^"]+)"/);
  const searchWord = quoted?.[1] ?? userText.match(/search\s+(?:Base\s+token\s+)?"?([^".\n]+)"?/i)?.[1];
  if (tool === 'search_pairs' && searchWord) args.query = searchWord.trim();

  try {
    const result = await runPlaygroundSkill(skill.server, tool, args);
    return `**${skill.title}** · \`${skill.toolLabel}\`\n\n\`\`\`\n${result}\n\`\`\``;
  } catch (err) {
    return `**${skill.title}** failed: ${(err as Error).message}\n\nSet \`MIMO_API_KEY\` and \`BASE_RPC_URL\` in web \`.env.local\` (same as VPS).`;
  }
}

function buildLocalFallback(userText: string, modelId: string, memory: MemoryItem[]): string {
  const hits = searchMemory(userText, memory);
  const model = modelLabel(modelId);
  if (/help|commands/i.test(userText)) {
    return [
      '**HYRO Playground**',
      '• Chat uses **MiMo on your VPS** when `MIMO_API_KEY` is set',
      '• Click **Base MCP** skills — fills the message box; press Enter when ready',
      '• `hyro login` + `connect base` for full agent MCP on CLI',
      '',
      `API: ${SITE.apiUrl}`,
    ].join('\n');
  }
  const summary = userText.length > 100 ? userText.slice(0, 97) + '…' : userText;
  const lines = [`**HYRO · ${model}**`, summary];
  if (hits.length) lines.push('', 'Memory:', ...hits.map((h) => `• [${h.type}] ${h.content}`));
  lines.push('', '_Live MiMo unavailable — add MIMO_API_KEY to web `.env.local`._');
  return lines.join('\n');
}

export async function streamChatReply(
  userText: string,
  modelId: string,
  memory: MemoryItem[],
  onChunk: (partial: string) => void,
): Promise<string> {
  const skillInvoke = parseSkillInvocation(userText);

  if (skillInvoke) {
    const toolResult = await tryRunSkill(skillInvoke.skill, skillInvoke.cleanText);
    if (toolResult) {
      onChunk(toolResult);
      return toolResult;
    }
  }

  const memHits = searchMemory(userText, memory);
  const memBlock = memHits.length
    ? '\n\nRelevant memory:\n' + memHits.map((h) => `- [${h.type}] ${h.content}`).join('\n')
    : '';

  const apiMessages = [
    { role: 'system' as const, content: HYRO_AGENT_SYSTEM_PROMPT + memBlock },
    { role: 'user' as const, content: skillInvoke?.cleanText ?? userText },
  ];

  try {
    let acc = '';
    return await streamPlaygroundChat(apiMessages, modelId, (text) => {
      acc = text;
      onChunk(text);
    });
  } catch {
    const full = buildLocalFallback(userText, modelId, memory);
    const words = full.split(/(\s+)/);
    let acc = '';
    for (const w of words) {
      acc += w;
      onChunk(acc);
      await delay(10);
    }
    return full;
  }
}

export function seedWelcomeMessage(modelId: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: 'system',
    content: `HYRO gateway ready · ${modelLabel(modelId)} · Base MCP · x402 · Bankr skills in panel below — click to fill, then send.`,
    model: modelId,
    ts: Date.now(),
  };
}
