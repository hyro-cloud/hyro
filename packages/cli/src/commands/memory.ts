import { readFileSync, writeFileSync } from 'node:fs';
import { MEMORY_TYPES, type MemoryExportItem, type MemoryType } from '@hyro/core';
import { requireAuth } from '../api/client';
import { resolveAgent } from '../lib/agent';
import { CliError, EXIT } from '../lib/errors';
import { emit } from '../lib/render';
import { box, kv, print, success, table } from '../lib/output';
import { theme } from '../theme';

export interface MemoryCommandOptions {
  json?: boolean;
  agent?: string;
  type?: string;
  tag?: string;
  importance?: string;
  limit?: string;
  out?: string;
}

export async function runMemoryCommand(
  sub: string | undefined,
  args: string[],
  opts: MemoryCommandOptions,
): Promise<void> {
  const client = requireAuth();
  const json = Boolean(opts.json);

  if (sub === 'add') {
    const agent = await resolveAgent(client, opts.agent);
    const content = args.join(' ').trim();
    if (!content) {
      throw new CliError('Provide memory text.', EXIT.usage, 'hyro memory add "fact" --type fact');
    }
    const type = (opts.type as MemoryType) || 'fact';
    if (!MEMORY_TYPES.includes(type)) {
      throw new CliError(`type must be one of: ${MEMORY_TYPES.join(', ')}`, EXIT.usage);
    }
    const { item } = await client.memory.add({
      agentId: agent.id,
      type,
      content,
      ...(opts.tag ? { metadata: { tags: [opts.tag] } } : {}),
      ...(opts.importance ? { importance: Number(opts.importance) } : {}),
    });
    emit(json, { item }, () => success(`Stored ${theme.amber(item.type)} memory ${theme.dim(item.id)}.`));
    return;
  }

  if (sub === 'search') {
    const agent = await resolveAgent(client, opts.agent);
    const query = args.join(' ').trim();
    if (!query) throw new CliError('Provide a search query.', EXIT.usage);
    const limit = opts.limit ? Number(opts.limit) : 8;
    const { results } = await client.memory.search({ agentId: agent.id, query, limit });
    emit(json, { results }, () => {
      if (!results.length) return void print(theme.dim('No relevant memories.'));
      print('');
      for (const r of results) {
        print(`  ${theme.amber(r.score.toFixed(2))} ${theme.dim(`[${r.type}]`)} ${r.content}`);
      }
      print('');
    });
    return;
  }

  if (sub === 'forget' || sub === 'rm') {
    const id = args[0];
    if (!id) throw new CliError('Usage: hyro memory forget <id>', EXIT.usage);
    await client.memory.remove(id);
    success(`Forgot memory ${id}.`);
    return;
  }

  if (sub === 'export') {
    const agent = await resolveAgent(client, opts.agent);
    const { items } = await client.memory.export(agent.id);
    const jsonl = items.map((i) => JSON.stringify(i)).join('\n');
    if (opts.out) {
      writeFileSync(opts.out, jsonl + '\n');
      success(`Exported ${items.length} memories → ${opts.out}`);
      return;
    }
    print(jsonl);
    return;
  }

  if (sub === 'import') {
    const agent = await resolveAgent(client, opts.agent);
    const file = args[0];
    if (!file) throw new CliError('Usage: hyro memory import <file.jsonl>', EXIT.usage);
    const items = readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as MemoryExportItem);
    const { imported } = await client.memory.import(agent.id, items);
    success(`Imported ${imported} memories into ${theme.amber(agent.slug)}.`);
    return;
  }

  if (sub === 'list' || sub === 'ls') {
    const agent = await resolveAgent(client, opts.agent);
    const { items } = await client.memory.list({ agentId: agent.id, limit: 50 });
    emit(json, { items }, () => {
      if (!items.length) return void print(theme.dim('No memories yet.'));
      print('');
      print(
        table(
          ['type', 'importance', 'content'],
          items.map((m) => [
            theme.amber(m.type),
            m.importance.toFixed(2),
            m.content.length > 70 ? `${m.content.slice(0, 69)}…` : m.content,
          ]),
        ),
      );
      print('');
    });
    return;
  }

  // Default: stats overview
  const agent = await resolveAgent(client, opts.agent);
  const { items } = await client.memory.list({ agentId: agent.id, limit: 100 });
  const byType: Record<string, number> = {};
  for (const m of items) byType[m.type] = (byType[m.type] ?? 0) + 1;
  emit(json, { agent: agent.slug, total: items.length, byType }, () => {
    print('');
    print(
      box(
        [
          `${theme.bold(agent.name)} ${theme.dim(`(${agent.slug})`)}`,
          '',
          ...kv([
            ['total', String(items.length)],
            ...MEMORY_TYPES.map((t) => [t, String(byType[t] ?? 0)] as [string, string]),
          ]).split('\n'),
        ],
        'MEMORY',
      ),
    );
    print('');
  });
}
