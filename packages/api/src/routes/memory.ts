import type { FastifyInstance } from 'fastify';
import {
  MEMORY_TYPES,
  memoryImportSchema,
  memorySearchSchema,
  memoryUpsertSchema,
  paginationSchema,
} from '@hyro/core';
import { z } from 'zod';
import { parse } from '../lib/validate';

const memoryListQuery = paginationSchema.extend({
  agentId: z.string().min(1),
  type: z.enum(MEMORY_TYPES).optional(),
});

const exportSchema = z.object({ agentId: z.string().min(1) });

export function memoryRoutes(app: FastifyInstance): void {
  const { memory } = app.ctx.services;
  const auth = app.authenticate;

  app.post('/v1/memory', { preHandler: [auth, app.authorize(['memory:write'])] }, async (req, reply) => {
    const input = parse(memoryUpsertSchema, req.body);
    const result = await memory.upsert(req.principal!.userId, input);
    void reply.status(201);
    return result;
  });

  app.post('/v1/memory/search', { preHandler: [auth, app.authorize(['memory:read'])] }, async (req) => {
    const input = parse(memorySearchSchema, req.body);
    return memory.search(req.principal!.userId, input);
  });

  app.get('/v1/memory', { preHandler: [auth, app.authorize(['memory:read'])] }, async (req) => {
    const { agentId, type, limit, cursor } = parse(memoryListQuery, req.query);
    return memory.list(req.principal!.userId, { agentId, type, limit, cursor });
  });

  app.delete('/v1/memory/:id', { preHandler: [auth, app.authorize(['memory:write'])] }, async (req, reply) => {
    await memory.remove(req.principal!.userId, (req.params as { id: string }).id);
    void reply.status(204);
  });

  app.post('/v1/memory/export', { preHandler: [auth, app.authorize(['memory:read'])] }, async (req) => {
    const { agentId } = parse(exportSchema, req.body);
    return { items: await memory.export(req.principal!.userId, agentId) };
  });

  app.post('/v1/memory/import', { preHandler: [auth, app.authorize(['memory:write'])] }, async (req) => {
    const input = parse(memoryImportSchema, req.body);
    return memory.import(req.principal!.userId, input);
  });
}
