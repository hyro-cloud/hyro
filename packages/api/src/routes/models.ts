import type { FastifyInstance } from 'fastify';
import { BadRequestError, getModel, listModels, setDefaultModelSchema } from '@hyro/core';
import { parse } from '../lib/validate';

export function modelRoutes(app: FastifyInstance): void {
  const auth = app.authenticate;

  app.get('/v1/models', { preHandler: [auth] }, async () => {
    const models = listModels().map((m) => ({
      ...m,
      enabled: app.ctx.providers.isModelEnabled(m.id),
    }));
    return { models };
  });

  app.post('/v1/models/default', { preHandler: [auth] }, async (req) => {
    const { model } = parse(setDefaultModelSchema, req.body);
    const resolved = getModel(model);
    if (!resolved) throw new BadRequestError(`Unknown model: ${model}`);
    const user = await app.ctx.services.auth.setDefaultModel(req.principal!.userId, resolved.id);
    return { user };
  });
}
