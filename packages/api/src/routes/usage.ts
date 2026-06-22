import type { FastifyInstance } from 'fastify';
import { paginationSchema } from '@hyro/core';
import { z } from 'zod';
import { parse } from '../lib/validate';

const summaryQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export function usageRoutes(app: FastifyInstance): void {
  const { usage } = app.ctx.services;
  const auth = app.authenticate;

  app.get('/v1/usage/summary', { preHandler: [auth] }, async (req) => {
    const { from, to } = parse(summaryQuery, req.query);
    return usage.summary(req.principal!.userId, from, to);
  });

  app.get('/v1/usage/events', { preHandler: [auth] }, async (req) => {
    const { limit, cursor } = parse(paginationSchema, req.query);
    return usage.events(req.principal!.userId, { limit, cursor });
  });
}
