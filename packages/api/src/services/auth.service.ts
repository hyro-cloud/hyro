import {
  ALL_SCOPES,
  ConflictError,
  DEFAULTS,
  NotFoundError,
  UnauthorizedError,
  newApiKeySecret,
  newId,
  randomToken,
  type ApiKeyInfo,
  type CreateApiKeyInput,
  type LoginInput,
  type Plan,
  type Principal,
  type RegisterInput,
  type Scope,
  type Tokens,
  type User,
} from '@hyro/core';
import { API_KEY_PREFIX } from '@hyro/core';
import type { AppContext } from '../context';
import { apiKeyPrefix, hashApiKey, hashPassword, verifyPassword } from '../lib/crypto';
import { signJwt, verifyJwt } from '../lib/jwt';
import { iso, isoOrNull } from '../lib/row';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  default_model: string;
  plan: Plan;
  created_at: Date;
  updated_at: Date;
}

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: Scope[];
  last_used_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    defaultModel: row.default_model,
    plan: row.plan,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapApiKey(row: ApiKeyRow): ApiKeyInfo {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    scopes: row.scopes,
    lastUsedAt: isoOrNull(row.last_used_at),
    revokedAt: isoOrNull(row.revoked_at),
    createdAt: iso(row.created_at),
  };
}

export class AuthService {
  constructor(private readonly ctx: AppContext) {}

  private get db() {
    return this.ctx.db;
  }
  private get config() {
    return this.ctx.config;
  }

  async register(input: RegisterInput): Promise<{ user: User; tokens: Tokens }> {
    const existing = await this.db.queryOne('SELECT id FROM users WHERE email = $1', [input.email]);
    if (existing) throw new ConflictError('An account with this email already exists');

    const id = newId('user');
    const passwordHash = await hashPassword(input.password);
    const row = await this.db.queryOne<UserRow>(
      `INSERT INTO users (id, email, password_hash, display_name, default_model, plan)
       VALUES ($1, $2, $3, $4, $5, 'free') RETURNING *`,
      [id, input.email, passwordHash, input.displayName ?? null, this.config.defaultModel],
    );
    const user = mapUser(row!);
    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async login(input: LoginInput): Promise<{ user: User; tokens: Tokens }> {
    const row = await this.db.queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [input.email]);
    if (!row || !(await verifyPassword(input.password, row.password_hash))) {
      throw new UnauthorizedError('Invalid email or password');
    }
    const user = mapUser(row);
    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async refresh(refreshToken: string): Promise<{ tokens: Tokens }> {
    const hash = hashApiKey(refreshToken, this.config.apiKeyPepper);
    const session = await this.db.queryOne<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM sessions
       WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
      [hash],
    );
    if (!session) throw new UnauthorizedError('Invalid or expired refresh token');

    const userRow = await this.db.queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [session.user_id]);
    if (!userRow) throw new UnauthorizedError('Account no longer exists');

    // Rotate: revoke the used token, issue a fresh pair.
    await this.db.query('UPDATE sessions SET revoked_at = now() WHERE id = $1', [session.id]);
    const tokens = await this.issueTokens(mapUser(userRow));
    return { tokens };
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = hashApiKey(refreshToken, this.config.apiKeyPepper);
    await this.db.query('UPDATE sessions SET revoked_at = now() WHERE refresh_token_hash = $1', [hash]);
  }

  async me(userId: string): Promise<User> {
    const row = await this.db.queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [userId]);
    if (!row) throw new NotFoundError('User');
    return mapUser(row);
  }

  async setDefaultModel(userId: string, model: string): Promise<User> {
    const row = await this.db.queryOne<UserRow>(
      'UPDATE users SET default_model = $2, updated_at = now() WHERE id = $1 RETURNING *',
      [userId, model],
    );
    if (!row) throw new NotFoundError('User');
    return mapUser(row);
  }

  private async issueTokens(user: User): Promise<Tokens> {
    const accessToken = signJwt(
      { sub: user.id, scopes: ALL_SCOPES, via: 'session' },
      this.config.jwtSecret,
      DEFAULTS.accessTokenTtlSeconds,
    );
    const refreshToken = randomToken();
    await this.db.query(
      `INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, $3, now() + ($4 || ' seconds')::interval)`,
      [
        newId('session'),
        user.id,
        hashApiKey(refreshToken, this.config.apiKeyPepper),
        String(DEFAULTS.refreshTokenTtlSeconds),
      ],
    );
    return {
      accessToken,
      refreshToken,
      expiresIn: DEFAULTS.accessTokenTtlSeconds,
      tokenType: 'Bearer',
    };
  }

  /** Resolve a Bearer token (JWT session or API key) to a Principal. */
  async resolvePrincipal(token: string): Promise<Principal> {
    if (token.startsWith(API_KEY_PREFIX)) {
      const hash = hashApiKey(token, this.config.apiKeyPepper);
      const row = await this.db.queryOne<{ id: string; user_id: string; scopes: Scope[] }>(
        'SELECT id, user_id, scopes FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL',
        [hash],
      );
      if (!row) throw new UnauthorizedError('Invalid API key');
      // Fire‑and‑forget last‑used update.
      void this.db.query('UPDATE api_keys SET last_used_at = now() WHERE id = $1', [row.id]);
      return { userId: row.user_id, scopes: row.scopes, keyId: row.id, via: 'api_key' };
    }

    const claims = verifyJwt(token, this.config.jwtSecret);
    const scopes = Array.isArray(claims.scopes) ? (claims.scopes as Scope[]) : [...ALL_SCOPES];
    return { userId: claims.sub, scopes, keyId: null, via: 'session' };
  }

  async createApiKey(
    userId: string,
    input: CreateApiKeyInput,
  ): Promise<{ apiKey: ApiKeyInfo; secret: string }> {
    const secret = newApiKeySecret();
    const row = await this.db.queryOne<ApiKeyRow>(
      `INSERT INTO api_keys (id, user_id, name, prefix, key_hash, scopes)
       VALUES ($1, $2, $3, $4, $5, $6::text[]) RETURNING *`,
      [
        newId('apiKey'),
        userId,
        input.name,
        apiKeyPrefix(secret),
        hashApiKey(secret, this.config.apiKeyPepper),
        input.scopes,
      ],
    );
    return { apiKey: mapApiKey(row!), secret };
  }

  async listApiKeys(userId: string): Promise<ApiKeyInfo[]> {
    const rows = await this.db.query<ApiKeyRow>(
      'SELECT * FROM api_keys WHERE user_id = $1 ORDER BY id DESC',
      [userId],
    );
    return rows.map(mapApiKey);
  }

  async revokeApiKey(userId: string, id: string): Promise<void> {
    const row = await this.db.queryOne(
      'UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId],
    );
    if (!row) throw new NotFoundError('API key');
  }
}
