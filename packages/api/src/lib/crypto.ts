/** Password hashing and API‑key fingerprinting. */
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Store only a peppered SHA‑256 of API key secrets. */
export function hashApiKey(secret: string, pepper: string): string {
  return createHash('sha256').update(`${secret}:${pepper}`).digest('hex');
}

/** Human‑visible, non‑secret prefix of an API key (`hyro_sk_` + 4 chars). */
export function apiKeyPrefix(secret: string): string {
  return secret.slice(0, 12);
}
