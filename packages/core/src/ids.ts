/**
 * Sortable, prefixed identifiers for HYRO.
 *
 * IDs are ULIDs (lexicographically sortable, time‑ordered) with a short typed
 * prefix, e.g. `agt_01J9Z3K8Q9X2M4N6P8R0S2T4V6`. ULIDs sort by creation time which
 * makes them ideal as opaque pagination cursors.
 */
import { randomBytes } from 'node:crypto';

// Crockford base32 — excludes I, L, O, U to avoid ambiguity.
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = CROCKFORD.length; // 32
const TIME_LEN = 10;
const RANDOM_LEN = 16;

function encodeTime(now: number, len: number): string {
  let str = '';
  let value = now;
  for (let i = len; i > 0; i--) {
    const mod = value % ENCODING_LEN;
    str = CROCKFORD.charAt(mod) + str;
    value = (value - mod) / ENCODING_LEN;
  }
  return str;
}

function encodeRandom(len: number): string {
  // 256 is divisible by 32, so `byte % 32` is unbiased.
  const bytes = randomBytes(len);
  let str = '';
  for (let i = 0; i < len; i++) {
    str += CROCKFORD.charAt(bytes[i]! % ENCODING_LEN);
  }
  return str;
}

/** Generate a raw 26‑char ULID. */
export function ulid(seedTime: number = Date.now()): string {
  return encodeTime(seedTime, TIME_LEN) + encodeRandom(RANDOM_LEN);
}

/** Map of entity kinds to their id prefixes. */
export const ID_PREFIXES = {
  user: 'usr',
  session: 'ses',
  apiKey: 'key',
  agent: 'agt',
  agentVersion: 'agv',
  run: 'run',
  runStep: 'stp',
  memory: 'mem',
  mcpServer: 'mcp',
  grant: 'grt',
  listing: 'lst',
  usage: 'usg',
  request: 'req',
} as const;

export type IdKind = keyof typeof ID_PREFIXES;

/** Generate a prefixed, sortable id for an entity kind. */
export function newId(kind: IdKind): string {
  return `${ID_PREFIXES[kind]}_${ulid()}`;
}

/** Narrow check that an id has the expected prefix. */
export function isId(value: unknown, kind: IdKind): value is string {
  return typeof value === 'string' && value.startsWith(`${ID_PREFIXES[kind]}_`);
}

// ---------------------------------------------------------------------------
// Secrets
// ---------------------------------------------------------------------------

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function toBase62(buf: Buffer): string {
  let num = BigInt('0x' + (buf.toString('hex') || '0'));
  if (num === 0n) return '0';
  const base = 62n;
  let out = '';
  while (num > 0n) {
    const rem = Number(num % base);
    out = BASE62.charAt(rem) + out;
    num /= base;
  }
  return out;
}

/** API key secret shown to the user once: `hyro_sk_<base62>`. */
export function newApiKeySecret(): string {
  return `hyro_sk_${toBase62(randomBytes(32))}`;
}

/** Opaque high‑entropy token (refresh tokens, idempotency, etc.). */
export function randomToken(bytes = 48): string {
  return toBase62(randomBytes(bytes));
}
