import {
  ConflictError,
  NotFoundError,
  newId,
  type Agent,
  type AgentManifest,
  type MarketplaceCategory,
  type MarketplaceListing,
  type MarketplacePublishInput,
  type Paginated,
} from '@hyro/core';
import type { AppContext } from '../context';
import { asArray, iso } from '../lib/row';
import { paginate } from '../lib/pagination';

interface ListingRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: MarketplaceCategory;
  tags: string[];
  installs: number;
  rating: number;
  published_by: string;
  agent_version_id: string;
  created_at: Date;
}

function mapListing(row: ListingRow): MarketplaceListing {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    tags: asArray<string>(row.tags),
    installs: row.installs,
    rating: Number(row.rating),
    publishedBy: row.published_by,
    agentVersionId: row.agent_version_id,
    createdAt: iso(row.created_at),
  };
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'agent'
  );
}

export class MarketplaceService {
  constructor(private readonly ctx: AppContext) {}
  private get db() {
    return this.ctx.db;
  }

  async list(
    params: { q?: string; category?: string; limit: number; cursor?: string },
  ): Promise<Paginated<MarketplaceListing>> {
    const args: unknown[] = [];
    const where: string[] = [];
    if (params.q) {
      args.push(`%${params.q}%`);
      where.push(`(title ILIKE $${args.length} OR summary ILIKE $${args.length})`);
    }
    if (params.category) {
      args.push(params.category);
      where.push(`category = $${args.length}`);
    }
    if (params.cursor) {
      args.push(params.cursor);
      where.push(`id < $${args.length}`);
    }
    args.push(params.limit + 1);
    const sql = `SELECT * FROM marketplace_listings ${
      where.length ? `WHERE ${where.join(' AND ')}` : ''
    } ORDER BY id DESC LIMIT $${args.length}`;
    const rows = await this.db.query<ListingRow>(sql, args);
    return paginate(rows.map(mapListing), params.limit);
  }

  async get(slug: string): Promise<MarketplaceListing> {
    const row = await this.db.queryOne<ListingRow>('SELECT * FROM marketplace_listings WHERE slug = $1', [
      slug,
    ]);
    if (!row) throw new NotFoundError('Listing');
    return mapListing(row);
  }

  async publish(userId: string, input: MarketplacePublishInput): Promise<MarketplaceListing> {
    const agent = await this.ctx.services.agents.getOwned(userId, input.agentId);
    // Snapshot the current agent as an immutable version.
    const version = await this.ctx.services.agents.deploy(userId, agent.id, {});
    // Make the agent publicly visible.
    await this.db.query('UPDATE agents SET visibility = $2, updated_at = now() WHERE id = $1', [
      agent.id,
      'public',
    ]);

    const slug = await this.uniqueSlug(slugify(input.title));
    const row = await this.db.queryOne<ListingRow>(
      `INSERT INTO marketplace_listings
        (id, slug, title, summary, category, tags, published_by, agent_version_id)
       VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8) RETURNING *`,
      [
        newId('listing'),
        slug,
        input.title,
        input.summary,
        input.category,
        input.tags ?? [],
        userId,
        version.id,
      ],
    );
    return mapListing(row!);
  }

  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base;
    for (let i = 2; i < 1000; i++) {
      const exists = await this.db.queryOne('SELECT 1 FROM marketplace_listings WHERE slug = $1', [
        candidate,
      ]);
      if (!exists) return candidate;
      candidate = `${base}-${i}`;
    }
    throw new ConflictError('Could not allocate a unique listing slug');
  }

  async install(userId: string, slug: string): Promise<Agent> {
    const listing = await this.get(slug);
    const version = await this.db.queryOne<{ manifest: Record<string, unknown> }>(
      'SELECT manifest FROM agent_versions WHERE id = $1',
      [listing.agentVersionId],
    );
    if (!version) throw new NotFoundError('Agent version');
    const agent = await this.ctx.services.agents.createFromManifest(
      userId,
      version.manifest as unknown as AgentManifest,
    );
    await this.db.query('UPDATE marketplace_listings SET installs = installs + 1 WHERE id = $1', [
      listing.id,
    ]);
    return agent;
  }
}
