import { Command } from 'commander';
import { registerLoginCommand } from '../commands/login';
import { registerChatCommand, registerRunCommand } from '../commands/chat';
import { registerMemoryCommand } from '../commands/memory-cmd';
import { registerDeployCommand } from '../commands/deploy';
import { registerMcpCommand } from '../commands/mcp-cmd';
import { registerConnectCommand } from '../commands/connect-cmd';
import { renderBanner } from '../theme';
import { print } from '../lib/output';
import { CLI_VERSION } from '../version';
import { setColorEnabled } from '../theme';

const KNOWN_COMMANDS = new Set([
  'login',
  'chat',
  'run',
  'memory',
  'deploy',
  'mcp',
  'connect',
  'disconnect',
  'dashboard',
  'home',
  'ui',
]);

export function createProgram(): Command {
  const program = new Command('hyro')
    .description('HYRO Cloud — The Operating System for Autonomous Agents')
    .version(CLI_VERSION, '-V, --version', 'Print version')
    .option('--json', 'Machine-readable JSON output')
    .option('--no-color', 'Disable ANSI colors')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.color === false) setColorEnabled(false);
    });

  registerLoginCommand(program);
  registerChatCommand(program);
  registerRunCommand(program);
  registerMemoryCommand(program);
  registerDeployCommand(program);
  registerMcpCommand(program);
  registerConnectCommand(program);

  program
    .command('dashboard')
    .aliases(['home', 'ui'])
    .description('Open the HYRO dashboard (TUI home)')
    .action(async () => {
      const { runDashboard } = await import('../ui/dashboard.js');
      await runDashboard();
    });

  program.addHelpText('after', () => {
    return (
      '\n' +
      renderBanner(CLI_VERSION) +
      '\nCommands:\n' +
      '  login      Authenticate with HYRO Cloud\n' +
      '  chat       Interactive agent chat (readline TUI)\n' +
      '  run        One-shot autonomous task\n' +
      '  memory     Agent memory (search, export, import)\n' +
      '  deploy     Deploy agent to cloud\n' +
      '  mcp        MCP registry, grants, and local tool calls\n' +
      '  connect    Connect sources on VPS (base, github, …) or show x402/Bankr guides\n' +
      '  dashboard  Open the HYRO dashboard (TUI home)\n' +
      '\nLocal chain reads (no login): hyro mcp call base get_usdc_balance address=0x...\n' +
      'Full agent + MCP on VPS: hyro login → hyro connect base → hyro run "..."\n' +
      '\nRun `hyro` with no arguments to open the dashboard. Type `chat` inside to talk to your agent.\n' +
      'Goals and facts added in the dashboard sync to VPS memory when logged in.\n'
    );
  });

  return program;
}

/** True when argv invokes a subcommand or global help/version flags. */
export function shouldParseArgv(argv: string[]): boolean {
  if (argv.includes('--help') || argv.includes('-h')) return true;
  if (argv.includes('--version') || argv.includes('-V')) return true;
  const first = argv.find((a) => !a.startsWith('-'));
  if (!first) return argv.length > 0;
  return KNOWN_COMMANDS.has(first);
}

export function printQuickHelp(): void {
  print(renderBanner(CLI_VERSION));
  print('  Usage: hyro <command> [args]');
  print('  Run with no command to open the HYRO dashboard.');
  print('  Type `chat` inside the dashboard, or run `hyro chat` directly.');
  print('');
}
