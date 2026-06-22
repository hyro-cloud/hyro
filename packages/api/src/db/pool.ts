/** PostgreSQL connection pool + a thin typed query helper. */
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import type { Config } from '../config';
import type { Logger } from '../logger';

export class Database {
  readonly pool: Pool;

  constructor(
    private readonly config: Config,
    private readonly log: Logger,
  ) {
    this.pool = new Pool({
      connectionString: config.databaseUrl,
      max: config.pgPoolMax,
      idleTimeoutMillis: config.pgIdleTimeoutMs,
      application_name: 'hyro-api',
    });
    this.pool.on('error', (err) => {
      this.log.error({ err }, 'Unexpected idle PostgreSQL client error');
    });
  }

  /** Run a parameterized query and return typed rows. */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: readonly unknown[] = [],
  ): Promise<T[]> {
    const res = await this.pool.query<T>(text, params as unknown[]);
    return res.rows;
  }

  /** Run a query expecting at most one row. */
  async queryOne<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: readonly unknown[] = [],
  ): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows[0] ?? null;
  }

  /** Execute a function inside a transaction, committing on success. */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (err) {
      this.log.warn({ err }, 'Database ping failed');
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
