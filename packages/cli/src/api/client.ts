import { HyroClient } from '@hyro/sdk';
import { activeApiUrl, activeToken } from '../config';
import { CliError, EXIT } from '../lib/errors';

/** Build a client using stored config + credentials. */
export function getClient(): HyroClient {
  return new HyroClient({ baseUrl: activeApiUrl(), token: activeToken(), timeoutMs: 180_000 });
}

/** Build a client and assert the user is authenticated. */
export function requireAuth(): HyroClient {
  if (!activeToken()) {
    throw new CliError('Not logged in.', EXIT.auth, "Run 'hyro login' or set HYRO_TOKEN.");
  }
  return getClient();
}

/** Quick reachability probe against the API. */
export async function isApiReachable(): Promise<boolean> {
  try {
    const client = new HyroClient({ baseUrl: activeApiUrl(), timeoutMs: 4000 });
    await client.health();
    return true;
  } catch {
    return false;
  }
}
