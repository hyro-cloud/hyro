/** Environment configuration: loaded once, validated, and shared across the API. */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { DEFAULTS, PROVIDERS, type ProviderId } from '@hyro/core';

// Load the nearest .env (workspace root or package cwd) without overriding real env.
for (const candidate of ['.env', '../../.env', '../../../.env']) {
  const path = resolve(process.cwd(), candidate);
  if (existsSync(path)) {
    dotenv.config({ path });
    break;
  }
}

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? def : v === 'true' || v === '1'));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(8080),
  PUBLIC_API_URL: z.string().url().default('http://localhost:8080'),

  JWT_SECRET: z.string().min(16).default('dev-insecure-jwt-secret-change-me-please-32b'),
  API_KEY_PEPPER: z.string().min(8).default('dev-insecure-pepper-change-me'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:4173'),

  DATABASE_URL: z.string().default('postgres://hyro:hyro@localhost:5432/hyro'),
  PG_POOL_MAX: z.coerce.number().int().positive().default(10),
  PG_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(30_000),

  REDIS_URL: z.string().optional(),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),

  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),

  DEFAULT_MODEL: z.string().default(DEFAULTS.model),
  EMBEDDING_MODEL: z.string().default(DEFAULTS.embeddingModel),
  EMBEDDING_DIM: z.coerce.number().int().positive().default(DEFAULTS.embeddingDim),

  BILLING_ENABLED: bool(false),
  STRIPE_SECRET_KEY: z.string().optional(),
  FREE_TIER_MONTHLY_TOKENS: z.coerce.number().int().nonnegative().default(2_000_000),

  MCP_REGISTRY_URL: z.string().default('https://registry.hyro.cloud'),
  MCP_SANDBOX: bool(true),
});

export type RawEnv = z.infer<typeof envSchema>;

export interface Config {
  env: RawEnv['NODE_ENV'];
  isProd: boolean;
  logLevel: RawEnv['LOG_LEVEL'];
  host: string;
  port: number;
  publicApiUrl: string;
  jwtSecret: string;
  apiKeyPepper: string;
  corsOrigins: string[];
  databaseUrl: string;
  pgPoolMax: number;
  pgIdleTimeoutMs: number;
  redisUrl: string | null;
  rateLimitMax: number;
  rateLimitWindow: string;
  providerKeys: Partial<Record<ProviderId, string>>;
  defaultModel: string;
  embeddingModel: string;
  embeddingDim: number;
  billingEnabled: boolean;
  stripeSecretKey: string | null;
  freeTierMonthlyTokens: number;
  mcpRegistryUrl: string;
  mcpSandbox: boolean;
}

let cached: Config | null = null;

export function loadConfig(): Config {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const e = parsed.data;

  const providerKeys: Partial<Record<ProviderId, string>> = {};
  if (e.ANTHROPIC_API_KEY) providerKeys.anthropic = e.ANTHROPIC_API_KEY;
  if (e.OPENAI_API_KEY) providerKeys.openai = e.OPENAI_API_KEY;
  if (e.GEMINI_API_KEY) providerKeys.gemini = e.GEMINI_API_KEY;
  if (e.OPENROUTER_API_KEY) providerKeys.openrouter = e.OPENROUTER_API_KEY;

  cached = {
    env: e.NODE_ENV,
    isProd: e.NODE_ENV === 'production',
    logLevel: e.LOG_LEVEL,
    host: e.API_HOST,
    // Honor the platform-injected PORT (Render/Railway/Fly/Heroku) before API_PORT.
    port: process.env.PORT ? Number(process.env.PORT) : e.API_PORT,
    publicApiUrl: e.PUBLIC_API_URL,
    jwtSecret: e.JWT_SECRET,
    apiKeyPepper: e.API_KEY_PEPPER,
    corsOrigins: e.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    databaseUrl: e.DATABASE_URL,
    pgPoolMax: e.PG_POOL_MAX,
    pgIdleTimeoutMs: e.PG_POOL_IDLE_TIMEOUT_MS,
    redisUrl: e.REDIS_URL ?? null,
    rateLimitMax: e.RATE_LIMIT_MAX,
    rateLimitWindow: e.RATE_LIMIT_WINDOW,
    providerKeys,
    defaultModel: e.DEFAULT_MODEL,
    embeddingModel: e.EMBEDDING_MODEL,
    embeddingDim: e.EMBEDDING_DIM,
    billingEnabled: e.BILLING_ENABLED,
    stripeSecretKey: e.STRIPE_SECRET_KEY ?? null,
    freeTierMonthlyTokens: e.FREE_TIER_MONTHLY_TOKENS,
    mcpRegistryUrl: e.MCP_REGISTRY_URL,
    mcpSandbox: e.MCP_SANDBOX,
  };

  if (cached.isProd && cached.jwtSecret.startsWith('dev-insecure')) {
    throw new Error('JWT_SECRET must be set to a secure value in production.');
  }

  return cached;
}

export const ENABLED_PROVIDERS = (config: Config): ProviderId[] =>
  PROVIDERS.filter((p) => p === 'local' || Boolean(config.providerKeys[p]));
