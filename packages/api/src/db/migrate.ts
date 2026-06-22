/** Idempotent SQL migrator. Applies migrations/*.sql in order, tracked in a ledger. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../config';
import { createLogger } from '../logger';
import { Database } from './pool';

const MIGRATIONS_DIR = resolve(__dirname, '../../migrations');

export async function runMigrations(): Promise<void> {
  const config = loadConfig();
  const log = createLogger(config);
  const db = new Database(config, log);

  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    text PRIMARY KEY,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const appliedRows = await db.query<{ version: string }>('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRows.map((r) => r.version));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      log.debug(`migration ${file} already applied`);
      continue;
    }
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    log.info(`applying migration ${file}`);
    await db.transaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [
        file,
        checksum,
      ]);
    });
    count++;
  }

  log.info(count ? `applied ${count} migration(s)` : 'database is up to date');
  await db.close();
}

if (require.main === module) {
  runMigrations().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
