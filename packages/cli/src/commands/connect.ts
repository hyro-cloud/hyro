import { connectMcpSource, disconnectMcpSource } from '../lib/sourceConnect';
import { DATA_SOURCES } from '../lib/workspace';
import { printIntegrationGuide } from '../lib/mcpSetup';
import { emit } from '../lib/render';
import { print, success } from '../lib/output';
import { theme } from '../theme';
import { CliError, EXIT } from '../lib/errors';

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
    throw new CliError(`Usage: hyro connect ${action} <source>`, EXIT.usage, 'Sources: base, dexscreener, github, http');
  }

  if (action === 'connect') {
    if (opts.guide || key === 'x402' || key === 'bankr' || key === 'base-mcp') {
      printIntegrationGuide(key === 'base-mcp' ? 'base-mcp' : key);
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
      print(theme.dim('  Official wallet/send: connect Base MCP in Cursor → mcp.base.org'));
      print(theme.dim('  x402 / Bankr: hyro connect x402  or  hyro connect bankr'));
      print('');
    });
    return;
  }

  await disconnectMcpSource(key);
  emit(json, { disconnected: key }, () => success(`${key} disconnected.`));
}
