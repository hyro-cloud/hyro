/** Zod schemas for API request validation. Inferred types are exported for reuse. */
import { z } from 'zod';
import {
  MARKETPLACE_CATEGORIES,
  MCP_TRANSPORTS,
  MEMORY_TYPES,
  SCOPES,
  VISIBILITIES,
  DEFAULTS,
} from './constants';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200);

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Use lowercase letters, numbers and dashes');

// ---- Auth -----------------------------------------------------------------

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(120).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(120),
  scopes: z.array(z.enum(SCOPES)).min(1),
});

// ---- Agents ---------------------------------------------------------------

export const agentConfigSchema = z.object({
  temperature: z.number().min(0).max(2).default(DEFAULTS.temperature),
  maxSteps: z.number().int().min(1).max(50).default(DEFAULTS.maxSteps),
  memoryScope: z.enum(['agent', 'user']).default(DEFAULTS.memoryScope),
  memoryTopK: z.number().int().min(0).max(50).default(DEFAULTS.memoryTopK),
  tools: z.array(z.string()).default([]),
});

export const createAgentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema.optional(),
  description: z.string().max(2000).optional(),
  systemPrompt: z.string().min(1).max(20000),
  model: z.string().min(1).default(DEFAULTS.model),
  config: agentConfigSchema.partial().optional(),
  visibility: z.enum(VISIBILITIES).default('private'),
});

export const updateAgentSchema = createAgentSchema.partial();

export const deployAgentSchema = z.object({
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Use semver, e.g. 1.0.0')
    .optional(),
  readme: z.string().max(50000).optional(),
});

// ---- Runs -----------------------------------------------------------------

export const runInputSchema = z.object({
  agentId: z.string().min(1),
  input: z.union([
    z.object({ task: z.string().min(1).max(20000) }),
    z.object({
      messages: z
        .array(
          z.object({
            role: z.enum(['system', 'user', 'assistant', 'tool']),
            content: z.string(),
          }),
        )
        .min(1),
    }),
  ]),
  model: z.string().optional(),
  maxSteps: z.number().int().min(1).max(50).optional(),
  stream: z.boolean().optional().default(false),
});

// ---- Memory ---------------------------------------------------------------

export const memoryUpsertSchema = z.object({
  agentId: z.string().min(1),
  type: z.enum(MEMORY_TYPES),
  content: z.string().trim().min(1).max(8000),
  metadata: z.record(z.unknown()).optional(),
  importance: z.number().min(0).max(1).optional(),
});

export const memorySearchSchema = z.object({
  agentId: z.string().min(1),
  query: z.string().trim().min(1).max(2000),
  types: z.array(z.enum(MEMORY_TYPES)).optional(),
  limit: z.number().int().min(1).max(50).default(DEFAULTS.memoryTopK),
});

export const memoryImportSchema = z.object({
  agentId: z.string().min(1),
  items: z
    .array(
      z.object({
        type: z.enum(MEMORY_TYPES),
        content: z.string().min(1).max(8000),
        metadata: z.record(z.unknown()).optional(),
        importance: z.number().min(0).max(1).optional(),
      }),
    )
    .min(1)
    .max(5000),
});

// ---- MCP ------------------------------------------------------------------

export const mcpInstallSchema = z.object({
  slug: slugSchema,
});

export const mcpRegisterSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  transport: z.enum(MCP_TRANSPORTS),
  install: z.object({
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    url: z.string().url().optional(),
  }),
  env: z.array(z.string()).optional(),
  tools: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        inputSchema: z.record(z.unknown()).default({}),
        dangerous: z.boolean().optional(),
      }),
    )
    .optional(),
  permissions: z.record(z.unknown()).optional(),
});

export const mcpGrantSchema = z.object({
  agentId: z.string().min(1),
  serverId: z.string().min(1),
  allowedTools: z.array(z.string().min(1)).min(1),
});

// ---- Marketplace ----------------------------------------------------------

export const marketplacePublishSchema = z.object({
  agentId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(500),
  category: z.enum(MARKETPLACE_CATEGORIES),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
});

// ---- Models ---------------------------------------------------------------

export const setDefaultModelSchema = z.object({
  model: z.string().min(1),
});

// ---- Pagination -----------------------------------------------------------

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(DEFAULTS.maxPageLimit).default(DEFAULTS.pageLimit),
  cursor: z.string().optional(),
});

// ---- Inferred types -------------------------------------------------------

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type DeployAgentInput = z.infer<typeof deployAgentSchema>;
export type RunInput = z.infer<typeof runInputSchema>;
export type MemoryUpsertInput = z.infer<typeof memoryUpsertSchema>;
export type MemorySearchInput = z.infer<typeof memorySearchSchema>;
export type MemoryImportInput = z.infer<typeof memoryImportSchema>;
export type McpInstallInput = z.infer<typeof mcpInstallSchema>;
export type McpRegisterInput = z.infer<typeof mcpRegisterSchema>;
export type McpGrantInput = z.infer<typeof mcpGrantSchema>;
export type MarketplacePublishInput = z.infer<typeof marketplacePublishSchema>;
export type SetDefaultModelInput = z.infer<typeof setDefaultModelSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
