/** Local CLI state: config + credentials under $HYRO_HOME (default ~/.hyro). */
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DEFAULTS } from '@hyro/core';

export interface CliConfig {
  apiUrl: string;
  model: string;
  activeAgent: string | null;
  /** cloud = HYRO API on VPS (default for all users). hermes = local dev only — do not ship to users. */
  runtime?: 'cloud' | 'hermes';
}

export interface Credentials {
  token: string | null;
  refreshToken: string | null;
  email: string | null;
}

export const HYRO_HOME = process.env.HYRO_HOME || join(homedir(), '.hyro');
const CONFIG_PATH = join(HYRO_HOME, 'config.json');
const CREDS_PATH = join(HYRO_HOME, 'credentials.json');

const DEFAULT_CONFIG: CliConfig = {
  apiUrl: process.env.HYRO_API_URL || 'http://localhost:8080',
  model: DEFAULTS.model,
  activeAgent: 'hyro',
  runtime: 'cloud',
};

const DEFAULT_CREDS: Credentials = { token: null, refreshToken: null, email: null };

function ensureHome(): void {
  if (!existsSync(HYRO_HOME)) mkdirSync(HYRO_HOME, { recursive: true });
}

function readJson<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback;
    return { ...fallback, ...(JSON.parse(readFileSync(path, 'utf8')) as Partial<T>) };
  } catch {
    return fallback;
  }
}

export function loadConfig(): CliConfig {
  return readJson(CONFIG_PATH, DEFAULT_CONFIG);
}

export function saveConfig(patch: Partial<CliConfig>): CliConfig {
  ensureHome();
  const next = { ...loadConfig(), ...patch };
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2));
  return next;
}

export function loadCreds(): Credentials {
  return readJson(CREDS_PATH, DEFAULT_CREDS);
}

export function saveCreds(patch: Partial<Credentials>): Credentials {
  ensureHome();
  const next = { ...loadCreds(), ...patch };
  writeFileSync(CREDS_PATH, JSON.stringify(next, null, 2));
  try {
    chmodSync(CREDS_PATH, 0o600);
  } catch {
    /* chmod is a no-op on some platforms */
  }
  return next;
}

export function clearCreds(): void {
  saveCreds({ token: null, refreshToken: null, email: null });
}

/** The active auth token: HYRO_TOKEN env wins, else stored credentials. */
export function activeToken(): string | null {
  return process.env.HYRO_TOKEN || loadCreds().token || null;
}

export function activeApiUrl(): string {
  return process.env.HYRO_API_URL || loadConfig().apiUrl;
}
