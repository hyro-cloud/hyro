import 'fastify';
import type { Principal } from '@hyro/core';
import type { AppContext } from '../context';

declare module 'fastify' {
  interface FastifyInstance {
    ctx: AppContext;
    /** preHandler: resolve and attach `request.principal` (401 if missing/invalid). */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** preHandler factory: assert the principal holds all required scopes (403 otherwise). */
    authorize: (
      scopes: readonly string[],
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    principal?: Principal;
    requestId: string;
  }
}
