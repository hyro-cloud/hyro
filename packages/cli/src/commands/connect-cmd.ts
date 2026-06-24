import { Command } from 'commander';
import { runConnectCommand } from './connect';
import { handleCliError } from '../cli/handle-error';

export function registerConnectCommand(program: Command): void {
  const connect = program.command('connect').description('Connect data sources (MCP on VPS) or show integration guides');

  connect
    .command('list')
    .description('List connectable sources')
    .action(async (_opts, cmd) => {
      try {
        await runConnectCommand('list', undefined, { json: cmd.optsWithGlobals().json });
      } catch (err) {
        handleCliError(err);
      }
    });

  connect
    .argument('[source]', 'base | dexscreener | github | http | x402 | bankr | base-mcp')
    .option('--guide', 'Print setup guide only (no VPS install)')
    .action(async (source: string | undefined, opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        if (!source) {
          await runConnectCommand('list', undefined, { json: globalOpts.json });
          return;
        }
        await runConnectCommand('connect', source, { json: globalOpts.json, guide: opts.guide });
      } catch (err) {
        handleCliError(err);
      }
    });

  program
    .command('disconnect <source>')
    .description('Disconnect a data source (removes MCP from VPS when logged in)')
    .action(async (source: string, _opts, cmd) => {
      try {
        await runConnectCommand('disconnect', source, { json: cmd.optsWithGlobals().json });
      } catch (err) {
        handleCliError(err);
      }
    });
}
