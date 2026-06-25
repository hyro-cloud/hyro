import { EventEmitter } from 'node:events';
import {
  NotFoundError,
  resolveModelId,
  type ChatMessage,
  type JsonObject,
  type Paginated,
  type Run,
  type RunInput,
  type RunStatus,
  type RunStep,
  type RunStepType,
  type RunUsage,
} from '@hyro/core';
import type { AppContext } from '../context';
import { runAgentLoop } from '../runtime/agentLoop';
import { asObject, iso, isoOrNull } from '../lib/row';
import { paginate } from '../lib/pagination';

interface RunRow {
  id: string;
  agent_id: string;
  user_id: string;
  status: RunStatus;
  model: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  usage: Record<string, unknown> | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
}

interface StepRow {
  id: string;
  run_id: string;
  idx: number;
  type: RunStepType;
  content: Record<string, unknown>;
  tokens: number;
  created_at: Date;
}

const EMPTY_USAGE: RunUsage = { tokensIn: 0, tokensOut: 0, costUsd: 0, steps: 0 };

function mapRun(row: RunRow): Run {
  return {
    id: row.id,
    agentId: row.agent_id,
    userId: row.user_id,
    status: row.status,
    model: row.model,
    input: asObject(row.input, {}),
    output: row.output ? asObject(row.output, {}) : null,
    error: row.error,
    usage: row.usage ? (asObject(row.usage, {}) as unknown as RunUsage) : EMPTY_USAGE,
    startedAt: isoOrNull(row.started_at),
    finishedAt: isoOrNull(row.finished_at),
    createdAt: iso(row.created_at),
  };
}

function mapStep(row: StepRow): RunStep {
  return {
    id: row.id,
    runId: row.run_id,
    idx: row.idx,
    type: row.type,
    content: asObject(row.content, {}),
    tokens: row.tokens,
    createdAt: iso(row.created_at),
  };
}

export type RunBusEvent = { kind: 'step'; step: RunStep } | { kind: 'end'; run: Run };

export class RunService {
  private readonly bus = new EventEmitter();
  private readonly started = new Set<string>();
  private readonly cancelRequested = new Set<string>();

  constructor(private readonly ctx: AppContext) {
    this.bus.setMaxListeners(0);
  }
  private get db() {
    return this.ctx.db;
  }

  async create(userId: string, input: RunInput): Promise<Run> {
    const agent = await this.ctx.services.agents.getOwned(userId, input.agentId);
    await this.ctx.services.usage.assertWithinQuota(userId);
    const rawModel = input.model ?? agent.model;
    const model = resolveModelId(rawModel) ?? rawModel;

    const row = await this.db.queryOne<RunRow>(
      `INSERT INTO runs (id, agent_id, user_id, status, model, input, usage)
       VALUES ($1, $2, $3, 'queued', $4, $5::jsonb, $6::jsonb) RETURNING *`,
      [
        this.newRunId(),
        agent.id,
        userId,
        model,
        JSON.stringify(input.input),
        JSON.stringify(EMPTY_USAGE),
      ],
    );
    const run = mapRun(row!);

    if (input.stream) {
      // Defer execution; the stream endpoint drives it.
      return run;
    }
    await this.execute(run.id);
    return this.reload(run.id);
  }

  private newRunId(): string {
    // Local import avoids a top‑level cycle warning; ids are cheap.
    const { newId } = require('@hyro/core') as typeof import('@hyro/core');
    return newId('run');
  }

  async execute(runId: string): Promise<void> {
    if (this.started.has(runId)) return;
    this.started.add(runId);
    const startedAt = Date.now();

    const runRow = await this.db.queryOne<RunRow>('SELECT * FROM runs WHERE id = $1', [runId]);
    if (!runRow || runRow.status === 'succeeded' || runRow.status === 'failed') {
      this.started.delete(runId);
      return;
    }

    const run = mapRun(runRow);
    await this.db.query("UPDATE runs SET status='running', started_at=now() WHERE id=$1", [runId]);

    const agent = await this.ctx.services.agents.getRowForRun(run.agentId);
    if (!agent) {
      await this.fail(runId, 'Agent no longer exists');
      return;
    }

    const messages = this.buildMessages(agent.systemPrompt, run.input);
    const task = this.extractTask(run.input);
    let idx = 0;

    try {
      const result = await runAgentLoop({
        ctx: this.ctx,
        userId: run.userId,
        agent,
        model: run.model,
        task,
        messages,
        maxSteps: agent.config.maxSteps,
        isCancelled: () => this.cancelRequested.has(runId),
        onStep: async (step) => {
          const stepRow = await this.persistStep(runId, idx++, step.type, step.content, step.tokens);
          this.emit(runId, { kind: 'step', step: stepRow });
        },
      });

      const cancelled = this.cancelRequested.has(runId);
      const status: RunStatus = cancelled ? 'cancelled' : 'succeeded';
      await this.db.query(
        `UPDATE runs SET status=$2, output=$3::jsonb, usage=$4::jsonb, finished_at=now() WHERE id=$1`,
        [runId, status, JSON.stringify(result.output), JSON.stringify(result.usage)],
      );

      await this.ctx.services.usage.record({
        userId: run.userId,
        agentId: run.agentId,
        runId,
        kind: 'model',
        model: run.model,
        tokensIn: result.usage.tokensIn,
        tokensOut: result.usage.tokensOut,
        costUsd: result.usage.costUsd,
        latencyMs: Date.now() - startedAt,
      });
    } catch (err) {
      await this.fail(runId, (err as Error).message);
    } finally {
      this.cancelRequested.delete(runId);
      this.emit(runId, { kind: 'end', run: await this.reload(runId) });
    }
  }

  private buildMessages(systemPrompt: string, input: JsonObject): ChatMessage[] {
    const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];
    if (Array.isArray((input as { messages?: unknown }).messages)) {
      for (const m of (input as { messages: { role: ChatMessage['role']; content: string }[] }).messages) {
        messages.push({ role: m.role, content: m.content });
      }
    } else if (typeof (input as { task?: unknown }).task === 'string') {
      messages.push({ role: 'user', content: (input as { task: string }).task });
    }
    return messages;
  }

  private extractTask(input: JsonObject): string {
    if (typeof (input as { task?: unknown }).task === 'string') return (input as { task: string }).task;
    const msgs = (input as { messages?: { role: string; content: string }[] }).messages;
    if (Array.isArray(msgs)) {
      const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
      return lastUser?.content ?? '';
    }
    return '';
  }

  private async persistStep(
    runId: string,
    idx: number,
    type: RunStepType,
    content: JsonObject,
    tokens: number,
  ): Promise<RunStep> {
    const { newId } = require('@hyro/core') as typeof import('@hyro/core');
    const row = await this.db.queryOne<StepRow>(
      `INSERT INTO run_steps (id, run_id, idx, type, content, tokens)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6) RETURNING *`,
      [newId('runStep'), runId, idx, type, JSON.stringify(content), tokens],
    );
    return mapStep(row!);
  }

  private async fail(runId: string, message: string): Promise<void> {
    await this.db.query(
      "UPDATE runs SET status='failed', error=$2, finished_at=now() WHERE id=$1",
      [runId, message],
    );
  }

  private emit(runId: string, event: RunBusEvent): void {
    this.bus.emit(`evt:${runId}`, event);
    void this.ctx.store.publish(`run:${runId}`, JSON.stringify(event)).catch(() => undefined);
  }

  async get(userId: string, id: string): Promise<{ run: Run; steps: RunStep[] }> {
    const run = await this.requireOwned(userId, id);
    const stepRows = await this.db.query<StepRow>(
      'SELECT * FROM run_steps WHERE run_id = $1 ORDER BY idx',
      [id],
    );
    return { run, steps: stepRows.map(mapStep) };
  }

  async list(
    userId: string,
    params: { agentId?: string; status?: string; limit: number; cursor?: string },
  ): Promise<Paginated<Run>> {
    const args: unknown[] = [userId];
    const where = ['user_id = $1'];
    if (params.agentId) {
      args.push(params.agentId);
      where.push(`agent_id = $${args.length}`);
    }
    if (params.status) {
      args.push(params.status);
      where.push(`status = $${args.length}`);
    }
    if (params.cursor) {
      args.push(params.cursor);
      where.push(`id < $${args.length}`);
    }
    args.push(params.limit + 1);
    const sql = `SELECT * FROM runs WHERE ${where.join(' AND ')} ORDER BY id DESC LIMIT $${args.length}`;
    const rows = await this.db.query<RunRow>(sql, args);
    return paginate(rows.map(mapRun), params.limit);
  }

  async cancel(userId: string, id: string): Promise<Run> {
    const run = await this.requireOwned(userId, id);
    if (run.status === 'queued') {
      await this.db.query("UPDATE runs SET status='cancelled', finished_at=now() WHERE id=$1", [id]);
    } else if (run.status === 'running') {
      this.cancelRequested.add(id);
    }
    return this.reload(id);
  }

  /** Stream a run's steps over a callback; drives execution if still queued. */
  async stream(
    userId: string,
    id: string,
    emit: (event: RunBusEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const { run, steps } = await this.get(userId, id);
    for (const step of steps) emit({ kind: 'step', step });

    if (run.status === 'succeeded' || run.status === 'failed' || run.status === 'cancelled') {
      emit({ kind: 'end', run });
      return;
    }

    await new Promise<void>((resolve) => {
      const handler = (event: RunBusEvent) => {
        emit(event);
        if (event.kind === 'end') cleanup();
      };
      const cleanup = () => {
        this.bus.off(`evt:${id}`, handler);
        signal.removeEventListener('abort', cleanup);
        resolve();
      };
      this.bus.on(`evt:${id}`, handler);
      signal.addEventListener('abort', cleanup, { once: true });
      if (run.status === 'queued') void this.execute(id).catch(() => undefined);
    });
  }

  private async reload(id: string): Promise<Run> {
    const row = await this.db.queryOne<RunRow>('SELECT * FROM runs WHERE id = $1', [id]);
    if (!row) throw new NotFoundError('Run');
    return mapRun(row);
  }

  private async requireOwned(userId: string, id: string): Promise<Run> {
    const row = await this.db.queryOne<RunRow>('SELECT * FROM runs WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);
    if (!row) throw new NotFoundError('Run');
    return mapRun(row);
  }
}
