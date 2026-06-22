/**
 * Typed error hierarchy shared across the API, SDK and CLI.
 *
 * Every error maps to a stable machine code, an HTTP status, and a JSON
 * representation matching the documented error model (see docs/API.md).
 */

export type ErrorCode =
  | 'bad_request'
  | 'validation_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'internal'
  | 'provider_error'
  | 'mcp_error'
  | 'payment_required';

export interface SerializedError {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

export class HyroError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;
  /** When false, the message is replaced by a generic one for clients. */
  readonly expose: boolean;

  constructor(
    code: ErrorCode,
    statusCode: number,
    message: string,
    options: { details?: Record<string, unknown>; expose?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    // Restore prototype chain (TS + extending built‑ins).
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = options.details;
    this.expose = options.expose ?? statusCode < 500;
  }

  toJSON(requestId?: string): SerializedError {
    return {
      error: {
        code: this.code,
        message: this.expose ? this.message : 'Internal server error',
        ...(this.details ? { details: this.details } : {}),
        ...(requestId ? { requestId } : {}),
      },
    };
  }
}

export class BadRequestError extends HyroError {
  constructor(message = 'Bad request', details?: Record<string, unknown>) {
    super('bad_request', 400, message, { details });
  }
}

export class ValidationError extends HyroError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super('validation_error', 400, message, { details });
  }
}

export class UnauthorizedError extends HyroError {
  constructor(message = 'Missing or invalid credentials') {
    super('unauthorized', 401, message);
  }
}

export class ForbiddenError extends HyroError {
  constructor(message = 'Insufficient scope', details?: Record<string, unknown>) {
    super('forbidden', 403, message, { details });
  }
}

export class NotFoundError extends HyroError {
  constructor(resource = 'Resource') {
    super('not_found', 404, `${resource} not found`);
  }
}

export class ConflictError extends HyroError {
  constructor(message = 'Resource already exists', details?: Record<string, unknown>) {
    super('conflict', 409, message, { details });
  }
}

export class RateLimitError extends HyroError {
  constructor(message = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super('rate_limited', 429, message, { details });
  }
}

export class PaymentRequiredError extends HyroError {
  constructor(message = 'Usage quota exceeded', details?: Record<string, unknown>) {
    super('payment_required', 402, message, { details });
  }
}

export class ProviderError extends HyroError {
  constructor(message = 'Model provider error', details?: Record<string, unknown>) {
    super('provider_error', 502, message, { details, expose: true });
  }
}

export class McpError extends HyroError {
  constructor(message = 'MCP runtime error', details?: Record<string, unknown>) {
    super('mcp_error', 502, message, { details, expose: true });
  }
}

export class InternalError extends HyroError {
  constructor(message = 'Internal server error', cause?: unknown) {
    super('internal', 500, message, { expose: false, cause });
  }
}

export function isHyroError(err: unknown): err is HyroError {
  return err instanceof HyroError;
}

/** Coerce any thrown value into a HyroError (used at error boundaries). */
export function toHyroError(err: unknown): HyroError {
  if (isHyroError(err)) return err;
  if (err instanceof Error) return new InternalError(err.message, err);
  return new InternalError(typeof err === 'string' ? err : 'Unknown error', err);
}
