import type { FastifyInstance } from 'fastify';
import { createApiKeySchema, loginSchema, refreshSchema, registerSchema } from '@hyro/core';
import { parse } from '../lib/validate';

export function authRoutes(app: FastifyInstance): void {
  const { auth } = app.ctx.services;

  app.post('/v1/auth/register', async (req, reply) => {
    const input = parse(registerSchema, req.body);
    const result = await auth.register(input);
    void reply.status(201);
    return result;
  });

  app.post('/v1/auth/login', async (req) => {
    const input = parse(loginSchema, req.body);
    return auth.login(input);
  });

  app.post('/v1/auth/refresh', async (req) => {
    const { refreshToken } = parse(refreshSchema, req.body);
    return auth.refresh(refreshToken);
  });

  app.post('/v1/auth/logout', async (req, reply) => {
    const { refreshToken } = parse(refreshSchema, req.body);
    await auth.logout(refreshToken);
    void reply.status(204);
  });

  app.get('/v1/auth/me', { preHandler: [app.authenticate] }, async (req) => {
    return { user: await auth.me(req.principal!.userId) };
  });

  app.post('/v1/auth/api-keys', { preHandler: [app.authenticate] }, async (req, reply) => {
    const input = parse(createApiKeySchema, req.body);
    const result = await auth.createApiKey(req.principal!.userId, input);
    void reply.status(201);
    return result;
  });

  app.get('/v1/auth/api-keys', { preHandler: [app.authenticate] }, async (req) => {
    return { keys: await auth.listApiKeys(req.principal!.userId) };
  });

  app.delete('/v1/auth/api-keys/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    await auth.revokeApiKey(req.principal!.userId, (req.params as { id: string }).id);
    void reply.status(204);
  });
}
