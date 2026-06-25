import { Command } from 'commander';
import { runMcpCommand } from './mcp';
import { handleCliError } from '../cli/handle-error';
import { CliError, EXIT } from '../lib/errors';
import { print } from '../lib/output';

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
    .command('connect [slug]')
    .description('OAuth-connect an MCP server (base-official → mcp.base.org)')
    .action(async (slug: string | undefined, _opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        const target = slug ?? 'base-official';
        if (target !== 'base-official') {
          throw new CliError('OAuth connect supports: base-official', EXIT.usage);
        }
        const { connectBaseOfficialMcp } = await import('./connect.js');
        await connectBaseOfficialMcp();
        if (globalOpts.json) print(JSON.stringify({ connected: target }));
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
    .command('call <slug> <tool> [args...]')
    .description('Call an MCP tool locally (base/dexscreener — no login required)')
    .action(async (slug: string, tool: string, args: string[], _opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        await runMcpCommand('call', [slug, tool, ...args], { json: globalOpts.json });
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
