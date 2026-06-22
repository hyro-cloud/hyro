import { Command } from 'commander';
import { runMemoryCommand } from './memory';
import { handleCliError } from '../cli/handle-error';

export function registerMemoryCommand(program: Command): void {
  const memory = program.command('memory').description('Inspect, search, export and import agent memory');

  memory
    .command('add <text...>')
    .description('Store a memory item')
    .option('--type <type>', 'Memory type (fact, goal, preference, conversation, state)', 'fact')
    .option('--tag <tag>', 'Optional tag')
    .option('--importance <n>', 'Importance 0–1')
    .option('--agent <slug>', 'Agent slug')
    .action(async (text: string[], opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runMemoryCommand('add', text, { ...opts, json: globalOpts.json });
      } catch (err) {
        handleCliError(err);
      }
    });

  memory
    .command('search <query...>')
    .description('Semantic memory search')
    .option('--limit <n>', 'Max results', '8')
    .option('--agent <slug>', 'Agent slug')
    .action(async (query: string[], opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runMemoryCommand('search', query, { ...opts, json: globalOpts.json });
      } catch (err) {
        handleCliError(err);
      }
    });

  memory
    .command('list')
    .alias('ls')
    .description('List recent memories')
    .option('--agent <slug>', 'Agent slug')
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runMemoryCommand('list', [], { agent: opts.agent, json: globalOpts.json });
      } catch (err) {
        handleCliError(err);
      }
    });

  memory
    .command('forget <id>')
    .alias('rm')
    .description('Delete a memory by id')
    .action(async (id: string, _opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runMemoryCommand('forget', [id], { json: globalOpts.json });
      } catch (err) {
        handleCliError(err);
      }
    });

  memory
    .command('export')
    .description('Export memories as JSONL')
    .option('--out <file>', 'Write to file instead of stdout')
    .option('--agent <slug>', 'Agent slug')
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runMemoryCommand('export', [], { ...opts, json: globalOpts.json });
      } catch (err) {
        handleCliError(err);
      }
    });

  memory
    .command('import <file>')
    .description('Import memories from JSONL')
    .option('--agent <slug>', 'Agent slug')
    .action(async (file: string, opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runMemoryCommand('import', [file], { agent: opts.agent, json: globalOpts.json });
      } catch (err) {
        handleCliError(err);
      }
    });

  memory
    .option('--agent <slug>', 'Agent slug')
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runMemoryCommand(undefined, [], { agent: opts.agent, json: globalOpts.json });
      } catch (err) {
        handleCliError(err);
      }
    });
}
