import type { FastifyInstance } from 'fastify';
import { HyroError, NotFoundError, RateLimitError, ValidationError, toHyroError } from '@hyro/core';
import { ZodError } from 'zod';

/** Maps all thrown errors to the documented JSON error model. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((req, reply) => {
    const err = new NotFoundError('Route');
    void reply.status(err.statusCode).send(err.toJSON(req.requestId));
  });

  app.setErrorHandler((error, req, reply) => {
    let hyro: HyroError;

    if (error instanceof HyroError) {
      hyro = error;
    } else if (error instanceof ZodError) {
      hyro = new ValidationError('Validation failed', {
        issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    } else if ((error as { statusCode?: number }).statusCode === 429) {
      hyro = new RateLimitError((error as Error).message);
    } else if ((error as { validation?: unknown }).validation) {
      hyro = new ValidationError((error as Error).message);
    } else {
      hyro = toHyroError(error);
    }

    if (hyro.statusCode >= 500) {
      req.log.error({ err: error, requestId: req.requestId }, 'Request failed');
    }
    void reply.status(hyro.statusCode).send(hyro.toJSON(req.requestId));
  });
}
