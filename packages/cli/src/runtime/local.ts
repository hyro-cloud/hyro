/**
 * Offline runtime — mirrors the cloud agent loop locally so `hyro run --offline`
 * works with no server. Memory lives in JSONL under $HYRO_HOME/memory and uses a
 * deterministic hashed embedder (the same approach as the API's local encoder).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { newId, type RunStepType } from '@hyro/core';
import { HYRO_HOME } from '../config/index';

const DIM = 256;

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function embed(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0);
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    const idx = fnv1a(tok) % DIM;
    vec[idx]! += (fnv1a(`s:${tok}`) & 1) === 0 ? 1 : -1;
  }
  let norm = Math.sqrt(vec.reduce((a, x) => a + x * x, 0)) || 1;
  return vec.map((x) => x / norm);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += (a[i] ?? 0) * (b[i] ?? 0);
  return dot;
}

export interface LocalMem {
  id: string;
  type: string;
  content: string;
  importance: number;
  vec: number[];
  ts: string;
}

export class LocalMemory {
  private readonly file: string;

  constructor(agentKey: string) {
    const dir = join(HYRO_HOME, 'memory');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.file = join(dir, `${agentKey.replace(/[^a-z0-9-]/gi, '_')}.jsonl`);
  }

  all(): LocalMem[] {
    if (!existsSync(this.file)) return [];
    return readFileSync(this.file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l) as LocalMem;
        } catch {
          return null;
        }
      })
      .filter((x): x is LocalMem => x !== null);
  }

  add(type: string, content: string, importance = 0.5): LocalMem {
    const item: LocalMem = {
      id: newId('memory'),
      type,
      content,
      importance,
      vec: embed(content),
      ts: new Date().toISOString(),
    };
    appendFileSync(this.file, JSON.stringify(item) + '\n');
    return item;
  }

  search(query: string, k = 5): { type: string; content: string; score: number }[] {
    const q = embed(query);
    return this.all()
      .map((m) => ({ type: m.type, content: m.content, score: cosine(q, m.vec) * (1 + 0.25 * m.importance) }))
      .filter((r) => r.score > 0.01)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  stats(): { total: number; byType: Record<string, number> } {
    const all = this.all();
    const byType: Record<string, number> = {};
    for (const m of all) byType[m.type] = (byType[m.type] ?? 0) + 1;
    return { total: all.length, byType };
  }
}

export interface LocalStepEvent {
  type: RunStepType;
  content: Record<string, unknown>;
}

function composeAnswer(
  task: string,
  agentName: string,
  results: { type: string; content: string }[],
): string {
  const lines: string[] = [];
  lines.push(`${agentName} (local runtime) processed your task:`);
  lines.push(`  "${task.length > 200 ? `${task.slice(0, 197)}…` : task}"`);
  lines.push('');
  if (results.length) {
    lines.push('Drawing on relevant memory:');
    for (const r of results.slice(0, 3)) lines.push(`  • [${r.type}] ${r.content}`);
    lines.push('');
  }
  lines.push('Proposed approach:');
  lines.push('  1. Decompose the task into concrete sub-steps.');
  lines.push('  2. Use tools/MCP to gather what is missing.');
  lines.push('  3. Execute, verify, and persist new findings to memory.');
  lines.push('');
  lines.push(
    'This was produced by the deterministic offline runtime. Log in (`hyro login`) or set a',
  );
  lines.push('provider key to run with a full model in HYRO Cloud.');
  return lines.join('\n');
}

export async function runLocalTask(opts: {
  task: string;
  agentName: string;
  model: string;
  memory: LocalMemory;
  onStep: (e: LocalStepEvent) => void | Promise<void>;
}): Promise<{ finalText: string }> {
  const { task, agentName, memory, onStep } = opts;

  await onStep({
    type: 'observe',
    content: { tools: ['memory_search', 'memory_write', 'think'], runtime: 'offline' },
  });

  await onStep({ type: 'tool_call', content: { name: 'memory_search', arguments: { query: task } } });
  const results = memory.search(task, 5);
  await onStep({
    type: 'tool_result',
    content: {
      name: 'memory_search',
      result: results.length
        ? results.map((r, i) => `${i + 1}. [${r.type}] (${r.score.toFixed(2)}) ${r.content}`).join('\n')
        : 'No relevant memories found.',
    },
  });

  await onStep({ type: 'decide', content: { text: 'Synthesizing a response with the local runtime.' } });

  const finalText = composeAnswer(task, agentName, results);
  await onStep({ type: 'final', content: { text: finalText } });

  memory.add('conversation', `Task: ${task.slice(0, 200)} → ${finalText.slice(0, 200)}`, 0.4);
  return { finalText };
}
