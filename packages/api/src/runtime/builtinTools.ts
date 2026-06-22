/** Built‑in tools available to every agent, executed in‑process. */
import type { ToolDefinition } from '@hyro/core';
import { MEMORY_TYPES } from '@hyro/core';
import type { AppContext } from '../context';

export interface ToolExecContext {
  ctx: AppContext;
  userId: string;
  agentId: string;
}

export interface BuiltinTool {
  definition: ToolDefinition;
  execute: (args: Record<string, unknown>, exec: ToolExecContext) => Promise<string>;
}

export const BUILTIN_TOOLS: Record<string, BuiltinTool> = {
  think: {
    definition: {
      name: 'think',
      description:
        'Record a private reasoning step. Use to plan before acting. Returns an acknowledgement.',
      inputSchema: {
        type: 'object',
        properties: { thought: { type: 'string', description: 'Your reasoning.' } },
        required: ['thought'],
      },
    },
    async execute(args) {
      const thought = String(args.thought ?? '').slice(0, 4000);
      return thought ? 'Acknowledged.' : 'No thought provided.';
    },
  },

  memory_search: {
    definition: {
      name: 'memory_search',
      description: 'Search the agent\'s long‑term memory by semantic similarity.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number', description: 'Max results (default 8).' },
        },
        required: ['query'],
      },
    },
    async execute(args, { ctx, userId, agentId }) {
      const query = String(args.query ?? '');
      const limit = Math.min(Number(args.limit ?? 8) || 8, 25);
      const { results } = await ctx.services.memory.search(userId, { agentId, query, limit });
      if (!results.length) return 'No relevant memories found.';
      return results
        .map((r, i) => `${i + 1}. [${r.type}] (${r.score.toFixed(2)}) ${r.content}`)
        .join('\n');
    },
  },

  memory_write: {
    definition: {
      name: 'memory_write',
      description: 'Persist a durable memory (fact, goal, preference, conversation or state).',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: [...MEMORY_TYPES] },
          content: { type: 'string' },
          importance: { type: 'number', description: '0..1 retrieval weight.' },
        },
        required: ['type', 'content'],
      },
    },
    async execute(args, { ctx, userId, agentId }) {
      const type = MEMORY_TYPES.includes(args.type as never) ? (args.type as never) : 'fact';
      const content = String(args.content ?? '').trim();
      if (!content) return 'Refused: empty memory content.';
      const importance =
        typeof args.importance === 'number' ? Math.max(0, Math.min(1, args.importance)) : undefined;
      const { item } = await ctx.services.memory.upsert(userId, {
        agentId,
        type,
        content,
        importance,
      });
      return `Stored memory ${item.id}.`;
    },
  },
};

export function builtinToolDefinitions(enabled: string[] | undefined): ToolDefinition[] {
  const all = Object.keys(BUILTIN_TOOLS);
  const names = enabled && enabled.length ? all.filter((n) => enabled.includes(n)) : all;
  return names.map((n) => BUILTIN_TOOLS[n]!.definition);
}
