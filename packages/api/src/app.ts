import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { VERSION } from '@hyro/core';
import type { Config } from './config';
import { buildContext, closeContext } from './context';
import { createLogger, type Logger } from './logger';
import { registerAuth } from './plugins/auth';
import { registerErrorHandler } from './plugins/errorHandler';
import { registerRequestContext } from './plugins/requestContext';
import { agentRoutes } from './routes/agents';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { marketplaceRoutes } from './routes/marketplace';
import { mcpRoutes } from './routes/mcp';
import { memoryRoutes } from './routes/memory';
import { modelRoutes } from './routes/models';
import { runRoutes } from './routes/runs';
import { usageRoutes } from './routes/usage';

export async function buildApp(config: Config, logger?: Logger): Promise<FastifyInstance> {
  const log = logger ?? createLogger(config);
  const ctx = buildContext(config, log);

  const app = Fastify({
    loggerInstance: log,
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024,
    disableRequestLogging: false,
  });

  app.decorate('ctx', ctx);

  // ---- Edge plugins -------------------------------------------------------
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: config.corsOrigins.length ? config.corsOrigins : true,
    credentials: true,
  });
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
  });

  // ---- OpenAPI / docs -----------------------------------------------------
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'HYRO Cloud API',
        description: 'The Operating System for Autonomous Agents.',
        version: VERSION,
      },
      servers: [{ url: config.publicApiUrl }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', description: 'JWT session or hyro_sk_ API key' },
        },
      },
    },
  });
  await app.register(swaggerUI, { routePrefix: '/docs' });

  // ---- Core hooks ---------------------------------------------------------
  registerRequestContext(app);
  registerErrorHandler(app);
  registerAuth(app);

  // ---- Routes -------------------------------------------------------------
  healthRoutes(app);
  authRoutes(app);
  agentRoutes(app);
  runRoutes(app);
  memoryRoutes(app);
  mcpRoutes(app);
  marketplaceRoutes(app);
  modelRoutes(app);
  usageRoutes(app);

  app.addHook('onClose', async () => {
    await closeContext(ctx);
  });

  return app;
}
