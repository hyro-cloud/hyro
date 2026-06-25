/**
 * OAuth 2.1 + PKCE for remote MCP servers (official Base MCP at mcp.base.org).
 */
import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestError,
  NotFoundError,
  type McpOAuthConnectionStatus,
  type McpOAuthTokenSet,
  type McpToolSchema,
} from '@hyro/core';
import type { AppContext } from '../context';
import { openJson, sealJson } from '../lib/seal';

const OAUTH_SLUGS = new Set(['base-official']);
const STATE_TTL_SEC = 600;
const CLIENT_CACHE_KEY = 'mcp:oauth:base-official:client_id';

interface OAuthMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
}

interface InstallEnv {
  oauth?: {
    sealed: string;
    connectedAt: string;
    expiresAt?: string;
  };
  discoveredTools?: McpToolSchema[];
}

function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export class McpOAuthService {
  constructor(private readonly ctx: AppContext) {}

  private get db() {
    return this.ctx.db;
  }

  isOAuthSlug(slug: string): boolean {
    return OAUTH_SLUGS.has(slug);
  }

  resourceUrl(slug: string): string {
    if (slug === 'base-official') return this.ctx.config.baseMcpUrl.replace(/\/$/, '');
    throw new BadRequestError(`OAuth not supported for MCP slug: ${slug}`);
  }

  redirectUri(slug: string): string {
    const base = this.ctx.config.publicApiUrl.replace(/\/$/, '');
    return `${base}/v1/mcp/oauth/${slug}/callback`;
  }

  private async metadata(): Promise<OAuthMetadata> {
    const url = `${this.resourceUrl('base-official')}/.well-known/oauth-authorization-server`;
    const res = await fetch(url);
    if (!res.ok) throw new BadRequestError(`Failed to load OAuth metadata (${res.status})`);
    return (await res.json()) as OAuthMetadata;
  }

  private async getClientId(meta: OAuthMetadata): Promise<string> {
    if (this.ctx.config.baseMcpClientId) return this.ctx.config.baseMcpClientId;

    const cached = await this.ctx.store.get(CLIENT_CACHE_KEY);
    if (cached) return cached;

    if (!meta.registration_endpoint) {
      throw new BadRequestError('OAuth registration endpoint missing — set BASE_MCP_CLIENT_ID');
    }

    const redirectUri = this.redirectUri('base-official');
    const res = await fetch(meta.registration_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_name: 'HYRO Cloud',
        redirect_uris: [redirectUri],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestError(`OAuth client registration failed: ${text.slice(0, 200)}`);
    }
    const body = (await res.json()) as { client_id: string };
    await this.ctx.store.set(CLIENT_CACHE_KEY, body.client_id, 60 * 60 * 24 * 30);
    return body.client_id;
  }

  /** Begin OAuth — returns URL to open in the user's browser. */
  async start(userId: string, slug: string): Promise<{ authorizeUrl: string; state: string }> {
    if (!this.isOAuthSlug(slug)) throw new BadRequestError(`MCP server '${slug}' does not use OAuth`);

    const server = await this.ctx.services.mcp.getBySlug(slug);
    await this.ctx.services.mcp.install(userId, slug);

    const meta = await this.metadata();
    const clientId = await this.getClientId(meta);
    const { verifier, challenge } = pkcePair();
    const state = randomBytes(24).toString('base64url');
    const resource = this.resourceUrl(slug);
    const redirectUri = this.redirectUri(slug);

    await this.ctx.store.set(
      `oauth:state:${state}`,
      JSON.stringify({ userId, slug, serverId: server.id, verifier, redirectUri }),
      STATE_TTL_SEC,
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      resource,
    });

    return { authorizeUrl: `${meta.authorization_endpoint}?${params}`, state };
  }

  /** OAuth redirect handler — exchange code for tokens. */
  async handleCallback(state: string, code: string): Promise<{ slug: string; userId: string }> {
    const raw = await this.ctx.store.get(`oauth:state:${state}`);
    if (!raw) throw new BadRequestError('OAuth state expired or invalid — try again');

    const pending = JSON.parse(raw) as {
      userId: string;
      slug: string;
      serverId: string;
      verifier: string;
      redirectUri: string;
    };
    await this.ctx.store.del(`oauth:state:${state}`);

    const meta = await this.metadata();
    const clientId = await this.getClientId(meta);
    const resource = this.resourceUrl(pending.slug);

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: pending.redirectUri,
      client_id: clientId,
      code_verifier: pending.verifier,
      resource,
    });

    const res = await fetch(meta.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new BadRequestError(
        `Token exchange failed: ${String(json.error_description ?? json.error ?? res.status)}`,
      );
    }

    const tokens: McpOAuthTokenSet = {
      accessToken: String(json.access_token),
      refreshToken: json.refresh_token ? String(json.refresh_token) : undefined,
      expiresAt:
        typeof json.expires_in === 'number'
          ? new Date(Date.now() + json.expires_in * 1000).toISOString()
          : undefined,
      tokenType: json.token_type ? String(json.token_type) : 'Bearer',
      scope: json.scope ? String(json.scope) : undefined,
    };

    await this.persistTokens(pending.userId, pending.serverId, tokens);
    return { slug: pending.slug, userId: pending.userId };
  }

  async status(userId: string, slug: string): Promise<McpOAuthConnectionStatus> {
    const server = await this.ctx.services.mcp.getBySlug(slug);
    const env = await this.readInstallEnvOptional(userId, server.id);
    const connected = Boolean(env.oauth?.sealed);
    let toolCount = env.discoveredTools?.length ?? 0;

    if (connected) {
      try {
        const token = await this.getAccessToken(userId, server.id, server.slug);
        if (token) {
          const tools = await this.ctx.mcpRuntime.listTools(server, { accessToken: token });
          toolCount = tools.length;
          await this.cacheDiscoveredTools(userId, server.id, tools);
        }
      } catch {
        /* best-effort refresh */
      }
    }

    return {
      slug,
      connected,
      connectedAt: env.oauth?.connectedAt ?? null,
      expiresAt: env.oauth?.expiresAt ?? null,
      toolCount,
    };
  }

  async disconnect(userId: string, slug: string): Promise<void> {
    const server = await this.ctx.services.mcp.getBySlug(slug);
    await this.db.query(
      `UPDATE user_mcp_installs SET env = '{}'::jsonb WHERE user_id = $1 AND mcp_server_id = $2`,
      [userId, server.id],
    );
  }

  async getAccessToken(userId: string, serverId: string, slug: string): Promise<string | null> {
    const env = await this.readInstallEnvOptional(userId, serverId);
    if (!env.oauth?.sealed) return null;

    let tokens = openJson<McpOAuthTokenSet>(this.ctx.config.mcpTokenSealSecret, env.oauth.sealed);
    const expiresAt = tokens.expiresAt ? Date.parse(tokens.expiresAt) : 0;
    const stale = expiresAt > 0 && expiresAt < Date.now() + 60_000;

    if (stale && tokens.refreshToken) {
      tokens = await this.refreshTokens(userId, serverId, slug, tokens.refreshToken);
    } else if (stale) {
      return null;
    }

    return tokens.accessToken;
  }

  async getDiscoveredTools(userId: string, serverId: string): Promise<McpToolSchema[] | null> {
    const env = await this.readInstallEnvOptional(userId, serverId);
    return env.discoveredTools?.length ? env.discoveredTools : null;
  }

  private async refreshTokens(
    userId: string,
    serverId: string,
    slug: string,
    refreshToken: string,
  ): Promise<McpOAuthTokenSet> {
    const meta = await this.metadata();
    const clientId = await this.getClientId(meta);
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      resource: this.resourceUrl(slug),
    });
    const res = await fetch(meta.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new BadRequestError(`Token refresh failed: ${String(json.error ?? res.status)}`);
    }
    const tokens: McpOAuthTokenSet = {
      accessToken: String(json.access_token),
      refreshToken: json.refresh_token ? String(json.refresh_token) : refreshToken,
      expiresAt:
        typeof json.expires_in === 'number'
          ? new Date(Date.now() + json.expires_in * 1000).toISOString()
          : undefined,
      tokenType: json.token_type ? String(json.token_type) : 'Bearer',
    };
    await this.persistTokens(userId, serverId, tokens);
    return tokens;
  }

  private async persistTokens(userId: string, serverId: string, tokens: McpOAuthTokenSet): Promise<void> {
    const sealed = sealJson(this.ctx.config.mcpTokenSealSecret, tokens);
    const env: InstallEnv = {
      oauth: {
        sealed,
        connectedAt: new Date().toISOString(),
        expiresAt: tokens.expiresAt,
      },
    };
    await this.db.query(
      `INSERT INTO user_mcp_installs (user_id, mcp_server_id, env)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id, mcp_server_id) DO UPDATE SET env = $3::jsonb, installed_at = now()`,
      [userId, serverId, JSON.stringify(env)],
    );
  }

  private async cacheDiscoveredTools(
    userId: string,
    serverId: string,
    tools: McpToolSchema[],
  ): Promise<void> {
    const env = await this.readInstallEnv(userId, serverId);
    await this.db.query(
      `UPDATE user_mcp_installs SET env = $3::jsonb WHERE user_id = $1 AND mcp_server_id = $2`,
      [userId, serverId, JSON.stringify({ ...env, discoveredTools: tools })],
    );
  }

  private async readInstallEnvOptional(userId: string, serverId: string): Promise<InstallEnv> {
    const row = await this.db.queryOne<{ env: Record<string, unknown> }>(
      'SELECT env FROM user_mcp_installs WHERE user_id = $1 AND mcp_server_id = $2',
      [userId, serverId],
    );
    if (!row) return {};
    return (row.env ?? {}) as InstallEnv;
  }

  private async readInstallEnv(userId: string, serverId: string): Promise<InstallEnv> {
    const env = await this.readInstallEnvOptional(userId, serverId);
    if (!env.oauth?.sealed && Object.keys(env).length === 0) {
      const row = await this.db.queryOne('SELECT 1 FROM user_mcp_installs WHERE user_id = $1 AND mcp_server_id = $2', [
        userId,
        serverId,
      ]);
      if (!row) throw new NotFoundError('Installed MCP server');
    }
    return env;
  }
}
