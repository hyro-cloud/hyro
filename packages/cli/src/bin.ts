import { createProgram, shouldParseArgv } from './cli/program';
import { handleCliError } from './cli/handle-error';

async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  if (!shouldParseArgv(argv) && process.stdin.isTTY && process.stdout.isTTY) {
    const { launchHome } = await import('./ink-entry.js');
    await launchHome();
    return;
  }

  const program = createProgram();
  await program.parseAsync(process.argv);
}

main().catch((err) => handleCliError(err));
