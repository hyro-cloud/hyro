import { Command } from 'commander';
import { registerLoginCommand } from '../commands/login';
import { registerChatCommand, registerRunCommand } from '../commands/chat';
import { registerMemoryCommand } from '../commands/memory-cmd';
import { registerDeployCommand } from '../commands/deploy';
import { registerMcpCommand } from '../commands/mcp-cmd';
import { renderBanner } from '../theme';
import { print } from '../lib/output';
import { CLI_VERSION } from '../version';
import { setColorEnabled } from '../theme';

const KNOWN_COMMANDS = new Set(['login', 'chat', 'run', 'memory', 'deploy', 'mcp']);

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

  program.addHelpText('after', () => {
    return (
      '\n' +
      renderBanner(CLI_VERSION) +
      '\nCommands:\n' +
      '  login    Authenticate with HYRO Cloud\n' +
      '  chat     Interactive Ink chat session\n' +
      '  run      One-shot autonomous task\n' +
      '  memory   Agent memory (search, export, import)\n' +
      '  deploy   Deploy agent to cloud\n' +
      '  mcp      MCP registry & grants\n' +
      '\nRun `hyro` with no arguments — opens HYRO chat (Hermes Agent brain when installed, else HYRO Cloud).\n' +
      'Set `"runtime": "hermes"` in ~/.hyro/config.json to always use Hermes intelligence under the `hyro` command.\n'
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
  print('  Run with no command to open the Ink terminal.');
  print('');
}
