import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../lib/validate';

const slugParam = z.object({ slug: z.string().min(1) });
const callbackQuery = z.object({
  state: z.string().min(1),
  code: z.string().min(1),
});

export function mcpOAuthRoutes(app: FastifyInstance): void {
  const auth = app.authenticate;
  const oauth = app.ctx.services.mcpOAuth;

  app.post('/v1/mcp/oauth/:slug/start', { preHandler: [auth, app.authorize(['mcp:manage'])] }, async (req) => {
    const { slug } = parse(slugParam, req.params);
    return oauth.start(req.principal!.userId, slug);
  });

  app.get('/v1/mcp/oauth/:slug/status', { preHandler: [auth, app.authorize(['mcp:manage'])] }, async (req) => {
    const { slug } = parse(slugParam, req.params);
    return oauth.status(req.principal!.userId, slug);
  });

  app.delete('/v1/mcp/oauth/:slug', { preHandler: [auth, app.authorize(['mcp:manage'])] }, async (req) => {
    const { slug } = parse(slugParam, req.params);
    await oauth.disconnect(req.principal!.userId, slug);
    return { ok: true };
  });

  /** Browser redirect from Base Account OAuth — no HYRO JWT (state carries user binding). */
  app.get('/v1/mcp/oauth/:slug/callback', async (req, reply) => {
    const { slug } = parse(slugParam, req.params);
    const { state, code } = parse(callbackQuery, req.query);
    try {
      const result = await oauth.handleCallback(state, code);
      if (result.slug !== slug) {
        return reply.redirect(`${app.ctx.config.mcpOAuthSuccessUrl}?error=slug_mismatch`);
      }
      return reply.redirect(`${app.ctx.config.mcpOAuthSuccessUrl}?connected=${encodeURIComponent(slug)}`);
    } catch (err) {
      const msg = encodeURIComponent((err as Error).message.slice(0, 120));
      return reply.redirect(`${app.ctx.config.mcpOAuthSuccessUrl}?error=${msg}`);
    }
  });
}
