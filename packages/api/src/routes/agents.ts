import type { FastifyInstance } from 'fastify';
import {
  createAgentSchema,
  deployAgentSchema,
  paginationSchema,
  updateAgentSchema,
} from '@hyro/core';
import { parse } from '../lib/validate';

export function agentRoutes(app: FastifyInstance): void {
  const { agents } = app.ctx.services;
  const auth = app.authenticate;

  app.get('/v1/agents', { preHandler: [auth, app.authorize(['agents:read'])] }, async (req) => {
    const { limit, cursor } = parse(paginationSchema, req.query);
    return agents.list(req.principal!.userId, { limit, cursor });
  });

  app.post('/v1/agents', { preHandler: [auth, app.authorize(['agents:write'])] }, async (req, reply) => {
    const input = parse(createAgentSchema, req.body);
    const agent = await agents.create(req.principal!.userId, input);
    void reply.status(201);
    return { agent };
  });

  app.get('/v1/agents/:id', { preHandler: [auth, app.authorize(['agents:read'])] }, async (req) => {
    const agent = await agents.get(req.principal!.userId, (req.params as { id: string }).id);
    return { agent };
  });

  app.patch('/v1/agents/:id', { preHandler: [auth, app.authorize(['agents:write'])] }, async (req) => {
    const input = parse(updateAgentSchema, req.body);
    const agent = await agents.update(req.principal!.userId, (req.params as { id: string }).id, input);
    return { agent };
  });

  app.delete('/v1/agents/:id', { preHandler: [auth, app.authorize(['agents:write'])] }, async (req, reply) => {
    await agents.remove(req.principal!.userId, (req.params as { id: string }).id);
    void reply.status(204);
  });

  app.post('/v1/agents/:id/deploy', { preHandler: [auth, app.authorize(['agents:write'])] }, async (req) => {
    const input = parse(deployAgentSchema, req.body ?? {});
    const version = await agents.deploy(req.principal!.userId, (req.params as { id: string }).id, input);
    return { version };
  });

  app.get('/v1/agents/:id/versions', { preHandler: [auth, app.authorize(['agents:read'])] }, async (req) => {
    const versions = await agents.versions(req.principal!.userId, (req.params as { id: string }).id);
    return { versions };
  });
}
