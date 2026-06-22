import { Command } from 'commander';
import { requireAuth } from '../api/client';
import { loadConfig } from '../config';
import { CliError, EXIT } from '../lib/errors';
import { emit } from '../lib/render';
import { success } from '../lib/output';
import { theme } from '../theme';
import { handleCliError } from '../cli/handle-error';

export async function runDeploy(opts: { agent?: string; version?: string; json?: boolean }): Promise<void> {
  const client = requireAuth();
  const ref = opts.agent || loadConfig().activeAgent;
  if (!ref) {
    throw new CliError('No agent selected.', EXIT.usage, 'Pass --agent <slug> or set activeAgent in config.');
  }
  const result = await client.agents.deploy(ref, {
    ...(opts.version ? { version: opts.version } : {}),
  });
  emit(opts.json ?? false, result, () => {
    success(`Deployed ${theme.amber(ref)} as ${theme.bold(`v${result.version.version}`)}.`);
  });
}

export function registerDeployCommand(program: Command): void {
  program
    .command('deploy')
    .description('Deploy the active agent to HYRO Cloud')
    .option('--agent <slug>', 'Agent slug to deploy')
    .option('--version <semver>', 'Version label')
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runDeploy({ agent: opts.agent, version: opts.version, json: globalOpts.json });
      } catch (err) {
        handleCliError(err);
      }
    });
}
