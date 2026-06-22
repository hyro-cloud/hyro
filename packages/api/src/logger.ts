import pino from 'pino';
import type { FastifyBaseLogger } from 'fastify';
import type { Config } from './config';

/**
 * The app logger type. Aliased to Fastify's base logger so a single pino instance can
 * back both Fastify's request logging and our services without type specialization.
 */
export type Logger = FastifyBaseLogger;

/** Build the root logger; pretty in dev, JSON in prod, with secret redaction. */
export function createLogger(config: Config): Logger {
  return pino({
    level: config.logLevel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        '*.password',
        '*.apiKey',
        '*.secret',
        '*.token',
      ],
      censor: '[redacted]',
    },
    base: { service: 'hyro-api' },
    transport: config.isProd
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service' },
        },
  });
}
