import type { FastifyInstance } from 'fastify';
import { paginationSchema, runInputSchema } from '@hyro/core';
import { z } from 'zod';
import { parse } from '../lib/validate';

const runListQuery = paginationSchema.extend({
  agentId: z.string().optional(),
  status: z.string().optional(),
});

export function runRoutes(app: FastifyInstance): void {
  const { runs } = app.ctx.services;
  const auth = app.authenticate;

  app.post('/v1/runs', { preHandler: [auth, app.authorize(['runs:execute'])] }, async (req, reply) => {
    const input = parse(runInputSchema, req.body);
    const run = await runs.create(req.principal!.userId, input);
    void reply.status(201);
    return { run };
  });

  app.get('/v1/runs', { preHandler: [auth, app.authorize(['agents:read'])] }, async (req) => {
    const { limit, cursor, agentId, status } = parse(runListQuery, req.query);
    return runs.list(req.principal!.userId, { limit, cursor, agentId, status });
  });

  app.get('/v1/runs/:id', { preHandler: [auth, app.authorize(['agents:read'])] }, async (req) => {
    return runs.get(req.principal!.userId, (req.params as { id: string }).id);
  });

  app.post('/v1/runs/:id/cancel', { preHandler: [auth, app.authorize(['runs:execute'])] }, async (req) => {
    const run = await runs.cancel(req.principal!.userId, (req.params as { id: string }).id);
    return { run };
  });

  // Server‑Sent Events: stream run steps live.
  app.get('/v1/runs/:id/stream', { preHandler: [auth, app.authorize(['runs:execute'])] }, async (req, reply) => {
    const userId = req.principal!.userId;
    const id = (req.params as { id: string }).id;

    // Validate ownership before hijacking the response.
    await runs.get(userId, id);

    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Request-Id': req.requestId,
    });
    raw.write(`event: open\ndata: {"runId":"${id}"}\n\n`);

    const controller = new AbortController();
    const heartbeat = setInterval(() => raw.write(': ping\n\n'), 15_000);
    req.raw.on('close', () => controller.abort());

    const send = (event: string, data: unknown) =>
      raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
      await runs.stream(
        userId,
        id,
        (evt) => {
          if (evt.kind === 'step') send('step', { step: evt.step });
          else send('done', { run: evt.run });
        },
        controller.signal,
      );
    } catch (err) {
      send('error', { error: (err as Error).message });
    } finally {
      clearInterval(heartbeat);
      raw.end();
    }
  });
}
