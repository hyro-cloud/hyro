import type { FastifyInstance } from 'fastify';
import { VERSION } from '@hyro/core';

export function healthRoutes(app: FastifyInstance): void {
  app.get('/healthz', async () => ({ status: 'ok', version: VERSION }));

  app.get('/readyz', async (_req, reply) => {
    const [db, redis] = await Promise.all([app.ctx.db.ping(), app.ctx.store.ping()]);
    const ok = db; // Redis is optional (in‑memory fallback).
    void reply.status(ok ? 200 : 503);
    return { status: ok ? 'ok' : 'degraded', db, redis, store: app.ctx.store.backend };
  });
}
