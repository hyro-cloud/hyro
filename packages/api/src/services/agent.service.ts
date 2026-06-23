import {
  ConflictError,
  DEFAULTS,
  HYRO_AGENT_META,
  HYRO_AGENT_SYSTEM_PROMPT,
  NotFoundError,
  newId,
  resolveModelId,
  type Agent,
  type AgentConfig,
  type AgentManifest,
  type AgentVersion,
  type CreateAgentInput,
  type DeployAgentInput,
  type Paginated,
  type UpdateAgentInput,
  type Visibility,
} from '@hyro/core';
import type { AppContext } from '../context';
import { asArray, asObject, iso, isoOrNull } from '../lib/row';
import { paginate } from '../lib/pagination';

interface AgentRow {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string | null;
  system_prompt: string;
  model: string;
  config: Record<string, unknown>;
  visibility: Visibility;
  created_at: Date;
  updated_at: Date;
}

interface VersionRow {
  id: string;
  agent_id: string;
  version: string;
  manifest: Record<string, unknown>;
  readme: string | null;
  created_at: Date;
}

function defaultConfig(): AgentConfig {
  return {
    temperature: DEFAULTS.temperature,
    maxSteps: DEFAULTS.maxSteps,
    memoryScope: DEFAULTS.memoryScope,
    memoryTopK: DEFAULTS.memoryTopK,
    tools: [],
  };
}

function mergeConfig(base: AgentConfig, patch?: Partial<AgentConfig>): AgentConfig {
  return { ...base, ...(patch ?? {}) };
}

function mapAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    systemPrompt: row.system_prompt,
    model: row.model,
    config: mergeConfig(defaultConfig(), asObject<Partial<AgentConfig>>(row.config, {})),
    visibility: row.visibility,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapVersion(row: VersionRow): AgentVersion {
  return {
    id: row.id,
    agentId: row.agent_id,
    version: row.version,
    manifest: row.manifest as unknown as AgentManifest,
    readme: row.readme,
    createdAt: iso(row.created_at),
  };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'agent'
  );
}

export class AgentService {
  constructor(private readonly ctx: AppContext) {}
  private get db() {
    return this.ctx.db;
  }

  async list(userId: string, params: { limit: number; cursor?: string }): Promise<Paginated<Agent>> {
    const args: unknown[] = [userId];
    let sql = 'SELECT * FROM agents WHERE user_id = $1';
    if (params.cursor) {
      args.push(params.cursor);
      sql += ` AND id < $${args.length}`;
    }
    args.push(params.limit + 1);
    sql += ` ORDER BY id DESC LIMIT $${args.length}`;
    const rows = await this.db.query<AgentRow>(sql, args);
    const page = paginate(rows.map(mapAgent), params.limit);
    return page;
  }

  /** Resolve an agent the caller is allowed to read (owned, or public). */
  async get(userId: string, ref: string): Promise<Agent> {
    const row = await this.findByRefForUser(ref, userId);
    if (!row) throw new NotFoundError('Agent');
    if (row.user_id !== userId && row.visibility === 'private') throw new NotFoundError('Agent');
    return mapAgent(row);
  }

  /** Resolve an agent owned by the caller (mutations). */
  async getOwned(userId: string, ref: string): Promise<Agent> {
    const row = await this.findByRefForUser(ref, userId, { ownedOnly: true });
    if (!row) throw new NotFoundError('Agent');
    return mapAgent(row);
  }

  private async findByRefForUser(
    ref: string,
    userId: string,
    opts: { ownedOnly?: boolean } = {},
  ): Promise<AgentRow | null> {
    if (ref.startsWith('agt_')) {
      const row = await this.db.queryOne<AgentRow>('SELECT * FROM agents WHERE id = $1', [ref]);
      if (!row) return null;
      if (opts.ownedOnly && row.user_id !== userId) return null;
      return row;
    }
    const owned = await this.db.queryOne<AgentRow>(
      'SELECT * FROM agents WHERE user_id = $1 AND slug = $2',
      [userId, ref],
    );
    if (owned || opts.ownedOnly) return owned;
    return this.db.queryOne<AgentRow>(
      "SELECT * FROM agents WHERE slug = $1 AND visibility = 'public' ORDER BY id LIMIT 1",
      [ref],
    );
  }

  private async findByRef(ref: string): Promise<AgentRow | null> {
    if (ref.startsWith('agt_')) {
      return this.db.queryOne<AgentRow>('SELECT * FROM agents WHERE id = $1', [ref]);
    }
    return this.db.queryOne<AgentRow>('SELECT * FROM agents WHERE slug = $1 ORDER BY id LIMIT 1', [ref]);
  }

  async create(userId: string, input: CreateAgentInput): Promise<Agent> {
    const slug = await this.uniqueSlug(userId, input.slug ?? slugify(input.name));
    const model = resolveModelId(input.model) ?? input.model;
    const config = mergeConfig(defaultConfig(), input.config);
    const row = await this.db.queryOne<AgentRow>(
      `INSERT INTO agents (id, user_id, slug, name, description, system_prompt, model, config, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9) RETURNING *`,
      [
        newId('agent'),
        userId,
        slug,
        input.name,
        input.description ?? null,
        input.systemPrompt,
        model,
        JSON.stringify(config),
        input.visibility ?? 'private',
      ],
    );
    return mapAgent(row!);
  }

  /** Every account gets a built-in HYRO agent (Hermes-style default). Idempotent. */
  async ensureDefaultHyroAgent(userId: string, model?: string): Promise<Agent> {
    const existing = await this.db.queryOne<AgentRow>(
      'SELECT * FROM agents WHERE user_id = $1 AND slug = $2',
      [userId, HYRO_AGENT_META.slug],
    );
    if (existing) return mapAgent(existing);
    return this.create(userId, {
      name: HYRO_AGENT_META.name,
      slug: HYRO_AGENT_META.slug,
      description: HYRO_AGENT_META.description,
      systemPrompt: HYRO_AGENT_SYSTEM_PROMPT,
      model: model ?? HYRO_AGENT_META.model,
      visibility: 'private',
    });
  }

  private async uniqueSlug(userId: string, base: string): Promise<string> {
    let candidate = base;
    for (let i = 2; i < 1000; i++) {
      const exists = await this.db.queryOne('SELECT 1 FROM agents WHERE user_id = $1 AND slug = $2', [
        userId,
        candidate,
      ]);
      if (!exists) return candidate;
      candidate = `${base}-${i}`;
    }
    throw new ConflictError('Could not allocate a unique slug');
  }

  async update(userId: string, ref: string, input: UpdateAgentInput): Promise<Agent> {
    const current = await this.getOwned(userId, ref);
    const next = {
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      systemPrompt: input.systemPrompt ?? current.systemPrompt,
      model: input.model ? resolveModelId(input.model) ?? input.model : current.model,
      config: input.config ? mergeConfig(current.config, input.config) : current.config,
      visibility: input.visibility ?? current.visibility,
    };
    const row = await this.db.queryOne<AgentRow>(
      `UPDATE agents SET name=$2, description=$3, system_prompt=$4, model=$5, config=$6::jsonb,
       visibility=$7, updated_at=now() WHERE id=$1 RETURNING *`,
      [
        current.id,
        next.name,
        next.description,
        next.systemPrompt,
        next.model,
        JSON.stringify(next.config),
        next.visibility,
      ],
    );
    return mapAgent(row!);
  }

  async remove(userId: string, ref: string): Promise<void> {
    const agent = await this.getOwned(userId, ref);
    await this.db.query('DELETE FROM agents WHERE id = $1', [agent.id]);
  }

  async buildManifest(agent: Agent): Promise<AgentManifest> {
    const grants = await this.db.query<{ slug: string; allowed_tools: string[] }>(
      `SELECT s.slug, g.allowed_tools FROM agent_mcp_grants g
       JOIN mcp_servers s ON s.id = g.mcp_server_id WHERE g.agent_id = $1`,
      [agent.id],
    );
    return {
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      model: agent.model,
      config: agent.config,
      mcp: grants.map((g) => ({ slug: g.slug, tools: asArray<string>(g.allowed_tools) })),
    };
  }

  async deploy(userId: string, ref: string, input: DeployAgentInput): Promise<AgentVersion> {
    const agent = await this.getOwned(userId, ref);
    const manifest = await this.buildManifest(agent);
    const version = input.version ?? (await this.nextVersion(agent.id));
    const exists = await this.db.queryOne('SELECT 1 FROM agent_versions WHERE agent_id=$1 AND version=$2', [
      agent.id,
      version,
    ]);
    if (exists) throw new ConflictError(`Version ${version} already exists`);
    const row = await this.db.queryOne<VersionRow>(
      `INSERT INTO agent_versions (id, agent_id, version, manifest, readme)
       VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING *`,
      [newId('agentVersion'), agent.id, version, JSON.stringify(manifest), input.readme ?? null],
    );
    return mapVersion(row!);
  }

  private async nextVersion(agentId: string): Promise<string> {
    const rows = await this.db.query<{ version: string }>(
      'SELECT version FROM agent_versions WHERE agent_id = $1',
      [agentId],
    );
    let max = [0, 0, 0];
    for (const { version } of rows) {
      const parts = version.split('.').map((n) => Number(n) || 0);
      if (parts.length === 3 && this.gt(parts, max)) max = parts;
    }
    return rows.length ? `${max[0]}.${max[1]}.${max[2]! + 1}` : '1.0.0';
  }

  private gt(a: number[], b: number[]): boolean {
    for (let i = 0; i < 3; i++) {
      if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
      if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
    }
    return false;
  }

  async versions(userId: string, ref: string): Promise<AgentVersion[]> {
    const agent = await this.getOwned(userId, ref);
    const rows = await this.db.query<VersionRow>(
      'SELECT * FROM agent_versions WHERE agent_id = $1 ORDER BY id DESC',
      [agent.id],
    );
    return rows.map(mapVersion);
  }

  async getRowForRun(agentId: string): Promise<Agent | null> {
    const row = await this.db.queryOne<AgentRow>('SELECT * FROM agents WHERE id = $1', [agentId]);
    return row ? mapAgent(row) : null;
  }

  /** Create an agent from a published manifest (marketplace install). */
  async createFromManifest(userId: string, manifest: AgentManifest): Promise<Agent> {
    return this.create(userId, {
      name: manifest.name,
      description: manifest.description ?? undefined,
      systemPrompt: manifest.systemPrompt,
      model: manifest.model,
      config: manifest.config,
      visibility: 'private',
    });
  }
}
