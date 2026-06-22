/** Minimal dependency‑free HS256 JWT signing/verification (node:crypto). */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { UnauthorizedError } from '@hyro/core';

export interface JwtClaims {
  sub: string;
  scopes?: string[];
  iat: number;
  exp: number;
  [key: string]: unknown;
}

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

export function signJwt(
  claims: Record<string, unknown>,
  secret: string,
  expiresInSeconds: number,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iat: now, exp: now + expiresInSeconds, ...claims }));
  const data = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyJwt<T extends JwtClaims = JwtClaims>(token: string, secret: string): T {
  const parts = token.split('.');
  if (parts.length !== 3) throw new UnauthorizedError('Malformed token');
  const header = parts[0]!;
  const payload = parts[1]!;
  const signature = parts[2]!;
  const data = `${header}.${payload}`;

  const expected = createHmac('sha256', secret).update(data).digest();
  const provided = Buffer.from(signature, 'base64url');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new UnauthorizedError('Invalid token signature');
  }

  let claims: T;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
  } catch {
    throw new UnauthorizedError('Malformed token payload');
  }
  if (typeof claims.exp === 'number' && claims.exp < Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedError('Token expired');
  }
  return claims;
}
