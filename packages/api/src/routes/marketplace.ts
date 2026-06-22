import type { FastifyInstance } from 'fastify';
import { marketplacePublishSchema, paginationSchema } from '@hyro/core';
import { z } from 'zod';
import { parse } from '../lib/validate';

const listQuery = paginationSchema.extend({
  q: z.string().optional(),
  category: z.string().optional(),
});

export function marketplaceRoutes(app: FastifyInstance): void {
  const { marketplace } = app.ctx.services;
  const auth = app.authenticate;

  // Public discovery — listings are public by definition.
  app.get('/v1/marketplace', async (req) => {
    const { q, category, limit, cursor } = parse(listQuery, req.query);
    return marketplace.list({ q, category, limit, cursor });
  });

  app.post(
    '/v1/marketplace/publish',
    { preHandler: [auth, app.authorize(['marketplace:publish'])] },
    async (req, reply) => {
      const input = parse(marketplacePublishSchema, req.body);
      const listing = await marketplace.publish(req.principal!.userId, input);
      void reply.status(201);
      return { listing };
    },
  );

  app.get('/v1/marketplace/:slug', async (req) => {
    return { listing: await marketplace.get((req.params as { slug: string }).slug) };
  });

  app.post(
    '/v1/marketplace/:slug/install',
    { preHandler: [auth, app.authorize(['agents:write'])] },
    async (req, reply) => {
      const agent = await marketplace.install(
        req.principal!.userId,
        (req.params as { slug: string }).slug,
      );
      void reply.status(201);
      return { agent };
    },
  );
}
