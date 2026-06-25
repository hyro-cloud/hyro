import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { requireAuth } from '../api/client';
import { connectMcpSource, disconnectMcpSource } from '../lib/sourceConnect';
import { DATA_SOURCES } from '../lib/workspace';
import { printIntegrationGuide } from '../lib/mcpSetup';
import { emit } from '../lib/render';
import { print, success } from '../lib/output';
import { theme } from '../theme';
import { CliError, EXIT } from '../lib/errors';

const execFileAsync = promisify(execFile);

async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  try {
    if (platform === 'win32') await execFileAsync('cmd', ['/c', 'start', '', url]);
    else if (platform === 'darwin') await execFileAsync('open', [url]);
    else await execFileAsync('xdg-open', [url]);
  } catch {
    print(theme.dim(`Open this URL in your browser:\n  ${url}`));
  }
}

/** OAuth connect to official Base MCP (mcp.base.org) via HYRO VPS proxy. */
export async function connectBaseOfficialMcp(): Promise<void> {
  const client = requireAuth();
  const slug = 'base-official';
  const status = await client.mcp.oauthStatus(slug);
  if (status.connected) {
    success(`Base MCP already connected (${status.toolCount} tools).`);
    print(theme.dim('  Grant to agent: hyro mcp grant base-official'));
    return;
  }

  const { authorizeUrl } = await client.mcp.oauthStart(slug);
  print('');
  print(theme.amber('Base Account OAuth'));
  print(theme.dim('  Approve HYRO to use your Base Account wallet tools on mcp.base.org'));
  print('');
  await openBrowser(authorizeUrl);
  print(theme.dim('  Waiting for approval in browser…'));
  print('');

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const next = await client.mcp.oauthStatus(slug);
    if (next.connected) {
      success(`Base MCP connected — ${next.toolCount} tools available.`);
      print('');
      print(theme.dim('  Next steps:'));
      print(theme.dim('    hyro mcp grant base-official'));
      print(theme.dim('    hyro run "show my wallets"'));
      print('');
      return;
    }
  }

  print(theme.dim('Timed out waiting for OAuth. Open the link manually if the browser did not open.'));
  print(authorizeUrl);
}

export interface ConnectOptions {
  json?: boolean;
  guide?: boolean;
}

export async function runConnectCommand(
  action: 'connect' | 'disconnect' | 'list',
  key?: string,
  opts: ConnectOptions = {},
): Promise<void> {
  const json = Boolean(opts.json);
  if (action === 'list') {
    emit(json, { sources: DATA_SOURCES }, () => {
      print('');
      for (const s of DATA_SOURCES) {
        const tag = s.local ? theme.green('local') : s.comingSoon ? theme.dim('soon') : theme.amber('mcp');
        print(`  ${theme.amber(s.key.padEnd(14))} ${s.label}  ${tag}`);
        if (s.setupHint) print(`    ${theme.dim(s.setupHint)}`);
      }
      print('');
      print(theme.dim('  Local reads (no login): hyro mcp call base get_usdc_balance address=0x…'));
      print(theme.dim('  VPS agent: hyro login → hyro connect base → hyro run "…"'));
      print('');
    });
    return;
  }

  if (!key) {
    throw new CliError(
      `Usage: hyro connect ${action} <source>`,
      EXIT.usage,
      'Sources: base, base-official, dexscreener, github, http',
    );
  }

  if (action === 'connect') {
    if (key === 'base-official' || key === 'base-mcp') {
      await connectBaseOfficialMcp();
      return;
    }
    if (opts.guide || key === 'x402' || key === 'bankr') {
      printIntegrationGuide(key);
      return;
    }
    await connectMcpSource(key);
    emit(json, { connected: key }, () => {
      success(`${key} connected on VPS (MCP installed + granted).`);
      print('');
      print(theme.dim('  Run chain reads locally anytime:'));
      print(theme.dim('    hyro mcp call base get_chain_info'));
      print(theme.dim('    hyro mcp call base get_usdc_balance address=0xYourAddress'));
      print('');
      print(theme.dim('  Full agent with MCP tools:'));
      print(theme.dim('    hyro run "summarize my Base USDC balance for 0x…"'));
      print('');
      print(theme.dim('  Official wallet/send via HYRO VPS:'));
      print(theme.dim('    hyro connect base-official'));
      print(theme.dim('  Or Cursor: mcp.base.org'));
      print(theme.dim('  x402 / Bankr: hyro connect x402  or  hyro connect bankr'));
      print('');
    });
    return;
  }

  await disconnectMcpSource(key);
  emit(json, { disconnected: key }, () => success(`${key} disconnected.`));
}
