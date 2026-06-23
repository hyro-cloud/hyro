import { createProgram, shouldParseArgv } from './cli/program';
import { handleCliError } from './cli/handle-error';

async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  if (!shouldParseArgv(argv) && process.stdin.isTTY && process.stdout.isTTY) {
    const { launchChat } = await import('./ink-entry.js');
    const { activeToken, loadConfig } = await import('./config');
    const cfg = loadConfig();
    await launchChat({
      agent: cfg.activeAgent ?? 'hyro',
      offline: !activeToken(),
    });
    return;
  }

  const program = createProgram();
  await program.parseAsync(process.argv);
}

main().catch((err) => handleCliError(err));
