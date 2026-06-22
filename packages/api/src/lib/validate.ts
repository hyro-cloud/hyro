import { ValidationError } from '@hyro/core';
import type { z, ZodTypeAny } from 'zod';

/**
 * Validate input against a Zod schema, throwing a HYRO ValidationError on failure.
 * Returns the schema's OUTPUT type so defaults/coercions are reflected in the result.
 */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError('Validation failed', {
      issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return result.data;
}
