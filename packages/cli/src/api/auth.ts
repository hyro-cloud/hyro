import { HyroClient } from '@hyro/sdk';
import { activeApiUrl, clearCreds, loadCreds, saveConfig, saveCreds } from '../config';
import { getClient } from './client';
import { HYRO_AGENT_META } from '@hyro/core';
import { CliError, EXIT } from '../lib/errors';
import { ask, askSecret } from '../lib/prompt';
import { theme } from '../theme';
import { success } from '../lib/output';

export interface LoginOptions {
  email?: string;
  password?: string;
  key?: string;
  register?: boolean;
  json?: boolean;
}

/** Authenticate against HYRO Cloud via API key or email/password. */
export async function login(opts: LoginOptions = {}): Promise<void> {
  const client = new HyroClient({ baseUrl: activeApiUrl() });

  if (opts.key) {
    client.setToken(opts.key);
    const { user } = await client.auth.me().catch(() => {
      throw new CliError('That API key was rejected.', EXIT.auth);
    });
    saveCreds({ token: opts.key, refreshToken: null, email: user.email });
    saveConfig({
      apiUrl: activeApiUrl(),
      activeAgent: HYRO_AGENT_META.slug,
      model: user.defaultModel,
    });
    if (opts.json) {
      console.log(JSON.stringify({ user, loggedIn: true }));
      return;
    }
    success(`Authenticated with API key as ${theme.bold(user.email)}. ${theme.dim('Saved locally.')}`);
    return;
  }

  const email = opts.email || (await ask(theme.amber('Email: ')));
  const password = opts.password || (await askSecret(theme.amber('Password: ')));
  if (!email || !password) {
    throw new CliError('Email and password are required.', EXIT.usage);
  }

  const result = opts.register
    ? await client.auth.register({ email, password })
    : await client.auth.login({ email, password });

  saveCreds({
    token: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    email: result.user.email,
  });
  saveConfig({
    apiUrl: activeApiUrl(),
    activeAgent: HYRO_AGENT_META.slug,
    model: result.user.defaultModel,
  });

  if (opts.json) {
    console.log(JSON.stringify({ user: result.user, loggedIn: true }));
    return;
  }

  success(
    `${opts.register ? 'Account created' : 'Logged in'} as ${theme.bold(result.user.email)}. ${theme.dim('Session saved — no need to login again.')}`,
  );
}

export function logout(json = false): void {
  clearCreds();
  if (json) console.log(JSON.stringify({ loggedIn: false }));
  else success('Logged out. Credentials cleared.');
}

export async function whoami(json = false): Promise<void> {
  const creds = loadCreds();
  if (!creds.token) {
    if (json) console.log(JSON.stringify({ loggedIn: false }));
    else throw new CliError('Not logged in.', EXIT.auth, "Run 'hyro login'.");
    return;
  }
  const client = getClient();
  const { user } = await client.auth.me();
  if (json) console.log(JSON.stringify({ user, loggedIn: true }));
  else {
    console.log(`  email  ${theme.bold(user.email)}`);
    console.log(`  plan   ${user.plan}`);
    console.log(`  model  ${theme.amber(user.defaultModel)}`);
    console.log(`  id     ${theme.dim(user.id)}`);
  }
}
