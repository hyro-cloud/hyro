import {
  NotFoundError,
  newId,
  type MemoryExportItem,
  type MemoryImportInput,
  type MemoryItem,
  type MemorySearchInput,
  type MemorySearchResult,
  type MemoryType,
  type MemoryUpsertInput,
  type Paginated,
} from '@hyro/core';
import type { AppContext } from '../context';
import { EmbeddingService } from './embeddings';
import { asObject, iso } from '../lib/row';
import { paginate } from '../lib/pagination';

const DEDUP_THRESHOLD = 0.97;
const DEFAULT_IMPORTANCE = 0.5;

interface MemoryRow {
  id: string;
  agent_id: string;
  user_id: string;
  type: MemoryType;
  content: string;
  metadata: Record<string, unknown>;
  importance: number;
  created_at: Date;
  updated_at: Date;
  last_accessed_at: Date;
}

function mapMemory(row: MemoryRow): MemoryItem {
  return {
    id: row.id,
    agentId: row.agent_id,
    userId: row.user_id,
    type: row.type,
    content: row.content,
    metadata: asObject(row.metadata, {}),
    importance: Number(row.importance),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    lastAccessedAt: iso(row.last_accessed_at),
  };
}

export class MemoryService {
  constructor(private readonly ctx: AppContext) {}
  private get db() {
    return this.ctx.db;
  }
  private get embeddings(): EmbeddingService {
    return this.ctx.embeddings;
  }

  private async assertAgent(userId: string, agentId: string): Promise<void> {
    const row = await this.db.queryOne<{ user_id: string }>('SELECT user_id FROM agents WHERE id = $1', [
      agentId,
    ]);
    if (!row || row.user_id !== userId) throw new NotFoundError('Agent');
  }

  async upsert(userId: string, input: MemoryUpsertInput): Promise<{ item: MemoryItem }> {
    await this.assertAgent(userId, input.agentId);
    const vec = await this.embeddings.embed(input.content);
    const literal = EmbeddingService.toPgVector(vec);
    const importance = input.importance ?? DEFAULT_IMPORTANCE;

    // Near‑duplicate detection within the same agent + type.
    const dup = await this.db.queryOne<{ id: string; score: number }>(
      `SELECT id, 1 - (embedding <=> $1::vector) AS score
       FROM memory_items WHERE agent_id = $2 AND type = $3
       ORDER BY embedding <=> $1::vector LIMIT 1`,
      [literal, input.agentId, input.type],
    );

    if (dup && Number(dup.score) >= DEDUP_THRESHOLD) {
      const row = await this.db.queryOne<MemoryRow>(
        `UPDATE memory_items
         SET importance = GREATEST(importance, $2), last_accessed_at = now(), updated_at = now()
         WHERE id = $1 RETURNING *`,
        [dup.id, importance],
      );
      return { item: mapMemory(row!) };
    }

    const row = await this.db.queryOne<MemoryRow>(
      `INSERT INTO memory_items (id, agent_id, user_id, type, content, metadata, importance, embedding)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::vector) RETURNING *`,
      [
        newId('memory'),
        input.agentId,
        userId,
        input.type,
        input.content,
        JSON.stringify(input.metadata ?? {}),
        importance,
        literal,
      ],
    );
    return { item: mapMemory(row!) };
  }

  async search(
    userId: string,
    input: MemorySearchInput,
  ): Promise<{ results: MemorySearchResult[] }> {
    await this.assertAgent(userId, input.agentId);
    const vec = await this.embeddings.embed(input.query);
    const literal = EmbeddingService.toPgVector(vec);
    const types = input.types && input.types.length ? input.types : null;

    const rows = await this.db.query<{
      id: string;
      type: MemoryType;
      content: string;
      metadata: Record<string, unknown>;
      importance: number;
      score: number;
    }>(
      `SELECT id, type, content, metadata, importance,
              1 - (embedding <=> $1::vector) AS score
       FROM memory_items
       WHERE agent_id = $2 AND ($3::text[] IS NULL OR type = ANY($3))
       ORDER BY embedding <=> $1::vector
       LIMIT $4`,
      [literal, input.agentId, types, input.limit],
    );

    if (rows.length) {
      await this.db.query(
        `UPDATE memory_items SET last_accessed_at = now() WHERE id = ANY($1::text[])`,
        [rows.map((r) => r.id)],
      );
    }

    // Re‑rank by similarity weighted by importance.
    const results = rows
      .map((r) => ({
        id: r.id,
        type: r.type,
        content: r.content,
        metadata: asObject(r.metadata, {}),
        importance: Number(r.importance),
        score: Number(r.score) * (1 + 0.25 * Number(r.importance)),
      }))
      .sort((a, b) => b.score - a.score);

    return { results };
  }

  async list(
    userId: string,
    params: { agentId: string; type?: MemoryType; limit: number; cursor?: string },
  ): Promise<Paginated<MemoryItem>> {
    await this.assertAgent(userId, params.agentId);
    const args: unknown[] = [params.agentId];
    let sql = 'SELECT * FROM memory_items WHERE agent_id = $1';
    if (params.type) {
      args.push(params.type);
      sql += ` AND type = $${args.length}`;
    }
    if (params.cursor) {
      args.push(params.cursor);
      sql += ` AND id < $${args.length}`;
    }
    args.push(params.limit + 1);
    sql += ` ORDER BY id DESC LIMIT $${args.length}`;
    const rows = await this.db.query<MemoryRow>(sql, args);
    return paginate(rows.map(mapMemory), params.limit);
  }

  async remove(userId: string, id: string): Promise<void> {
    const row = await this.db.queryOne(
      'DELETE FROM memory_items WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId],
    );
    if (!row) throw new NotFoundError('Memory');
  }

  async export(userId: string, agentId: string): Promise<MemoryExportItem[]> {
    await this.assertAgent(userId, agentId);
    const rows = await this.db.query<MemoryRow>(
      'SELECT * FROM memory_items WHERE agent_id = $1 ORDER BY id',
      [agentId],
    );
    return rows.map((r) => ({
      type: r.type,
      content: r.content,
      metadata: asObject(r.metadata, {}),
      importance: Number(r.importance),
    }));
  }

  async import(userId: string, input: MemoryImportInput): Promise<{ imported: number }> {
    await this.assertAgent(userId, input.agentId);
    const vectors = await this.embeddings.embedBatch(input.items.map((i) => i.content));
    let imported = 0;
    await this.db.transaction(async (client) => {
      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i]!;
        const literal = EmbeddingService.toPgVector(vectors[i] ?? (await this.embeddings.embed(item.content)));
        await client.query(
          `INSERT INTO memory_items (id, agent_id, user_id, type, content, metadata, importance, embedding)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::vector)`,
          [
            newId('memory'),
            input.agentId,
            userId,
            item.type,
            item.content,
            JSON.stringify(item.metadata ?? {}),
            item.importance ?? DEFAULT_IMPORTANCE,
            literal,
          ],
        );
        imported++;
      }
    });
    return { imported };
  }

  async stats(userId: string, agentId: string): Promise<{ total: number; byType: Record<string, number> }> {
    await this.assertAgent(userId, agentId);
    const rows = await this.db.query<{ type: string; count: string }>(
      'SELECT type, COUNT(*)::text AS count FROM memory_items WHERE agent_id = $1 GROUP BY type',
      [agentId],
    );
    const byType: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      const n = Number(r.count);
      byType[r.type] = n;
      total += n;
    }
    return { total, byType };
  }
}
