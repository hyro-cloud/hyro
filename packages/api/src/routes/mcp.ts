import type { FastifyInstance } from 'fastify';
import { mcpGrantSchema, mcpInstallSchema } from '@hyro/core';
import { z } from 'zod';
import { parse } from '../lib/validate';

const registryQuery = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
const grantsQuery = z.object({ agentId: z.string().min(1) });

export function mcpRoutes(app: FastifyInstance): void {
  const { mcp } = app.ctx.services;
  const auth = app.authenticate;

  app.get('/v1/mcp/registry', { preHandler: [auth, app.authorize(['mcp:manage'])] }, async (req) => {
    const { q, limit } = parse(registryQuery, req.query);
    return { servers: await mcp.registrySearch(q, limit) };
  });

  app.post('/v1/mcp/install', { preHandler: [auth, app.authorize(['mcp:manage'])] }, async (req, reply) => {
    const { slug } = parse(mcpInstallSchema, req.body);
    const server = await mcp.install(req.principal!.userId, slug);
    void reply.status(201);
    return { server };
  });

  app.get('/v1/mcp', { preHandler: [auth, app.authorize(['mcp:manage'])] }, async (req) => {
    return { servers: await mcp.listInstalled(req.principal!.userId) };
  });

  // Static routes registered before the param routes below.
  app.get('/v1/mcp/grants', { preHandler: [auth, app.authorize(['mcp:manage'])] }, async (req) => {
    const { agentId } = parse(grantsQuery, req.query);
    return { grants: await mcp.grants(req.principal!.userId, agentId) };
  });

  app.post('/v1/mcp/grants', { preHandler: [auth, app.authorize(['mcp:manage'])] }, async (req, reply) => {
    const input = parse(mcpGrantSchema, req.body);
    const grant = await mcp.grant(req.principal!.userId, input);
    void reply.status(201);
    return { grant };
  });

  app.get('/v1/mcp/:id/tools', { preHandler: [auth, app.authorize(['mcp:manage'])] }, async (req) => {
    return { tools: await mcp.tools(req.principal!.userId, (req.params as { id: string }).id) };
  });

  app.delete('/v1/mcp/:id', { preHandler: [auth, app.authorize(['mcp:manage'])] }, async (req, reply) => {
    await mcp.remove(req.principal!.userId, (req.params as { id: string }).id);
    void reply.status(204);
  });
}
