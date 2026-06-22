import type { FastifyInstance } from 'fastify';
import { HEADERS, newId } from '@hyro/core';

/** Assigns a request id to every request and echoes it back in `x-request-id`. */
export function registerRequestContext(app: FastifyInstance): void {
  app.addHook('onRequest', async (req, reply) => {
    const incoming = req.headers[HEADERS.requestId];
    const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) || newId('request');
    req.requestId = requestId;
    reply.header('x-request-id', requestId);
  });
}
