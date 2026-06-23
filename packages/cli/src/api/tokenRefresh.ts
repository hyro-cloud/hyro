import { HyroClient } from '@hyro/sdk';
import { activeApiUrl, loadCreds, saveCreds } from '../config';

let inflightRefresh: Promise<string | null> | null = null;

/**
 * Exchange a stored refresh token for a new access token.
 * Shared across concurrent requests so only one refresh runs at a time.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (process.env.HYRO_TOKEN) return null;

  const creds = loadCreds();
  if (!creds.refreshToken) return null;

  if (!inflightRefresh) {
    inflightRefresh = (async () => {
      try {
        const client = new HyroClient({ baseUrl: activeApiUrl() });
        const { tokens } = await client.auth.refresh(creds.refreshToken!);
        saveCreds({
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
        return tokens.accessToken;
      } catch {
        return null;
      } finally {
        inflightRefresh = null;
      }
    })();
  }

  return inflightRefresh;
}
