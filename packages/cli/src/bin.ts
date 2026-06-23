import { createProgram, shouldParseArgv } from './cli/program';
import { handleCliError } from './cli/handle-error';
import { resolveRuntime } from './runtime/resolveRuntime';
import { launchHermesInteractive } from './runtime/hermesBridge';

async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  if (!shouldParseArgv(argv) && process.stdin.isTTY && process.stdout.isTTY) {
    if (resolveRuntime() === 'hermes') {
      await launchHermesInteractive();
      return;
    }

    const { activeToken } = await import('./config');
    const { getClient } = await import('./api/client.js');
    const { ensureHyroAgent } = await import('./lib/ensureAgent.js');
    const { runDashboard } = await import('./ui/dashboard.js');
    if (activeToken()) {
      try {
        await ensureHyroAgent(getClient());
        const { autoConnectFreeSources } = await import('./lib/sourceConnect.js');
        await autoConnectFreeSources();
      } catch {
        /* offline — the dashboard still works locally */
      }
    }
    await runDashboard();
    return;
  }

  const program = createProgram();
  await program.parseAsync(process.argv);
}

main().catch((err) => handleCliError(err));
