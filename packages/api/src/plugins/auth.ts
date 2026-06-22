import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ForbiddenError, UnauthorizedError, type Scope } from '@hyro/core';

/** Registers `app.authenticate` and `app.authorize(scopes)` preHandlers. */
export function registerAuth(app: FastifyInstance): void {
  app.decorate('authenticate', async function (this: FastifyInstance, req: FastifyRequest) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Provide a Bearer token (JWT or API key)');
    }
    const token = header.slice('Bearer '.length).trim();
    req.principal = await app.ctx.services.auth.resolvePrincipal(token);
  });

  app.decorate('authorize', function (scopes: readonly string[]) {
    return async function (req: FastifyRequest, _reply: FastifyReply) {
      const principal = req.principal;
      if (!principal) throw new UnauthorizedError();
      const missing = scopes.filter((s) => !principal.scopes.includes(s as Scope));
      if (missing.length) {
        throw new ForbiddenError(`Missing required scope(s): ${missing.join(', ')}`, { missing });
      }
    };
  });
}
