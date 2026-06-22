import {
  PaymentRequiredError,
  newId,
  type Paginated,
  type UsageEvent,
  type UsageKind,
  type UsageSummary,
} from '@hyro/core';
import type { AppContext } from '../context';
import { iso } from '../lib/row';
import { paginate } from '../lib/pagination';

export interface RecordUsageInput {
  userId: string;
  agentId?: string | null;
  runId?: string | null;
  kind: UsageKind;
  model?: string | null;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
}

interface UsageRow {
  id: string;
  user_id: string;
  agent_id: string | null;
  run_id: string | null;
  kind: UsageKind;
  model: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: string;
  latency_ms: number;
  created_at: Date;
}

function mapEvent(row: UsageRow): UsageEvent {
  return {
    id: row.id,
    userId: row.user_id,
    agentId: row.agent_id,
    runId: row.run_id,
    kind: row.kind,
    model: row.model,
    tokensIn: row.tokens_in,
    tokensOut: row.tokens_out,
    costUsd: Number(row.cost_usd),
    latencyMs: row.latency_ms,
    createdAt: iso(row.created_at),
  };
}

function monthKey(userId: string): string {
  const now = new Date();
  return `usage:${userId}:${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export class UsageService {
  constructor(private readonly ctx: AppContext) {}
  private get db() {
    return this.ctx.db;
  }

  async record(input: RecordUsageInput): Promise<void> {
    await this.db.query(
      `INSERT INTO usage_events
        (id, user_id, agent_id, run_id, kind, model, tokens_in, tokens_out, cost_usd, latency_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        newId('usage'),
        input.userId,
        input.agentId ?? null,
        input.runId ?? null,
        input.kind,
        input.model ?? null,
        input.tokensIn,
        input.tokensOut,
        input.costUsd,
        input.latencyMs,
      ],
    );
    // Maintain a fast monthly token counter for quota checks.
    try {
      const key = monthKey(input.userId);
      const total = await this.ctx.store.incr(key);
      if (total === input.tokensIn + input.tokensOut || total <= 1) {
        await this.ctx.store.expire(key, 60 * 60 * 24 * 40);
      }
    } catch {
      /* counter is best‑effort */
    }
  }

  /** Throw PaymentRequired if billing is on and a free‑tier user is over budget. */
  async assertWithinQuota(userId: string): Promise<void> {
    if (!this.ctx.config.billingEnabled) return;
    const plan = await this.db.queryOne<{ plan: string }>('SELECT plan FROM users WHERE id = $1', [userId]);
    if (!plan || plan.plan !== 'free') return;
    const used = Number((await this.ctx.store.get(monthKey(userId))) ?? '0');
    if (used >= this.ctx.config.freeTierMonthlyTokens) {
      throw new PaymentRequiredError('Monthly free‑tier token budget exhausted. Upgrade to continue.', {
        used,
        limit: this.ctx.config.freeTierMonthlyTokens,
      });
    }
  }

  async summary(userId: string, from?: string, to?: string): Promise<UsageSummary> {
    const fromTs = from ?? new Date(Date.now() - 30 * 86_400_000).toISOString();
    const toTs = to ?? new Date().toISOString();
    const params = [userId, fromTs, toTs];

    const totalsRow = await this.db.queryOne<{
      tokens_in: string;
      tokens_out: string;
      cost_usd: string;
      runs: string;
    }>(
      `SELECT COALESCE(SUM(tokens_in),0) tokens_in, COALESCE(SUM(tokens_out),0) tokens_out,
              COALESCE(SUM(cost_usd),0) cost_usd, COUNT(DISTINCT run_id) runs
       FROM usage_events WHERE user_id=$1 AND created_at BETWEEN $2 AND $3`,
      params,
    );

    const byDay = await this.db.query<{
      date: Date;
      tokens_in: string;
      tokens_out: string;
      cost_usd: string;
    }>(
      `SELECT date_trunc('day', created_at)::date AS date,
              SUM(tokens_in) tokens_in, SUM(tokens_out) tokens_out, SUM(cost_usd) cost_usd
       FROM usage_events WHERE user_id=$1 AND created_at BETWEEN $2 AND $3
       GROUP BY 1 ORDER BY 1`,
      params,
    );

    const byModel = await this.db.query<{
      model: string;
      tokens_in: string;
      tokens_out: string;
      cost_usd: string;
    }>(
      `SELECT model, SUM(tokens_in) tokens_in, SUM(tokens_out) tokens_out, SUM(cost_usd) cost_usd
       FROM usage_events WHERE user_id=$1 AND created_at BETWEEN $2 AND $3 AND model IS NOT NULL
       GROUP BY model ORDER BY SUM(cost_usd) DESC`,
      params,
    );

    return {
      totals: {
        tokensIn: Number(totalsRow?.tokens_in ?? 0),
        tokensOut: Number(totalsRow?.tokens_out ?? 0),
        costUsd: Number(totalsRow?.cost_usd ?? 0),
        runs: Number(totalsRow?.runs ?? 0),
      },
      byDay: byDay.map((r) => ({
        date: iso(r.date).slice(0, 10),
        tokensIn: Number(r.tokens_in),
        tokensOut: Number(r.tokens_out),
        costUsd: Number(r.cost_usd),
      })),
      byModel: byModel.map((r) => ({
        model: r.model,
        tokensIn: Number(r.tokens_in),
        tokensOut: Number(r.tokens_out),
        costUsd: Number(r.cost_usd),
      })),
    };
  }

  async events(userId: string, params: { limit: number; cursor?: string }): Promise<Paginated<UsageEvent>> {
    const args: unknown[] = [userId];
    let sql = 'SELECT * FROM usage_events WHERE user_id = $1';
    if (params.cursor) {
      args.push(params.cursor);
      sql += ` AND id < $${args.length}`;
    }
    args.push(params.limit + 1);
    sql += ` ORDER BY id DESC LIMIT $${args.length}`;
    const rows = await this.db.query<UsageRow>(sql, args);
    return paginate(rows.map(mapEvent), params.limit);
  }
}
