import { Command } from 'commander';
import { runMcpCommand } from './mcp';
import { handleCliError } from '../cli/handle-error';

export function registerMcpCommand(program: Command): void {
  const mcp = program.command('mcp').description('Search, install and manage MCP servers');

  mcp
    .command('search [query...]')
    .description('Search the MCP registry')
    .action(async (query: string[], _opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runMcpCommand('search', query, { json: globalOpts.json });
      } catch (err) {
        handleCliError(err);
      }
    });

  mcp
    .command('install <slug>')
    .alias('add')
    .description('Install an MCP server')
    .action(async (slug: string, _opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runMcpCommand('install', [slug], { json: globalOpts.json });
      } catch (err) {
        handleCliError(err);
      }
    });

  mcp
    .command('tools <slug>')
    .description('List tools exposed by an installed server')
    .action(async (slug: string, _opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runMcpCommand('tools', [slug], { json: globalOpts.json });
      } catch (err) {
        handleCliError(err);
      }
    });

  mcp
    .command('grant <slug>')
    .description('Grant MCP tools to the active agent')
    .option('--agent <slug>', 'Agent slug')
    .option('--tools <list>', 'Comma-separated tool names or *', '*')
    .action(async (slug: string, opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runMcpCommand('grant', [slug], {
          json: globalOpts.json,
          agent: opts.agent,
          tools: opts.tools,
        });
      } catch (err) {
        handleCliError(err);
      }
    });

  mcp
    .command('remove <slug>')
    .alias('rm')
    .description('Uninstall an MCP server')
    .action(async (slug: string, _opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runMcpCommand('remove', [slug], { json: globalOpts.json });
      } catch (err) {
        handleCliError(err);
      }
    });

  mcp.action(async (_opts, cmd) => {
    try {
      const globalOpts = cmd.optsWithGlobals();
      await runMcpCommand(undefined, [], { json: globalOpts.json });
    } catch (err) {
      handleCliError(err);
    }
  });
}
