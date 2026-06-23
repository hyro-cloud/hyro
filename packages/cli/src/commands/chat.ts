import { Command } from 'commander';
import { executeRun } from './run';
import { handleCliError } from '../cli/handle-error';
import { resolveRuntime } from '../runtime/resolveRuntime';
import { launchHermesInteractive } from '../runtime/hermesBridge';

export function registerRunCommand(program: Command): void {
  program
    .command('run [task...]')
    .description('Execute a one-shot autonomous task')
    .option('--agent <slug>', 'Agent slug to run')
    .option('--model <id>', 'Override model')
    .option('--max-steps <n>', 'Maximum agent steps', (v) => parseInt(v, 10))
    .option('--offline', 'Force offline local runtime')
    .action(async (taskParts: string[], opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        const task = taskParts.join(' ').trim();
        await executeRun({
          task,
          agent: opts.agent,
          model: opts.model,
          maxSteps: opts.maxSteps,
          offline: opts.offline,
          json: globalOpts.json,
        });
      } catch (err) {
        handleCliError(err);
      }
    });
}

export function registerChatCommand(program: Command): void {
  program
    .command('chat')
    .description('Interactive chat with the active agent (same UI as dashboard chat)')
    .option('--agent <slug>', 'Agent slug')
    .option('--model <id>', 'Override model')
    .option('--offline', 'Force offline local runtime')
    .action(async (opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        if (globalOpts.json) {
          throw new Error('chat does not support --json. Use hyro run instead.');
        }
        if (!opts.offline && resolveRuntime() === 'hermes') {
          await launchHermesInteractive();
          return;
        }
        const { runChatSession } = await import('../ui/chat-session.js');
        await runChatSession({ banner: true });
      } catch (err) {
        handleCliError(err);
      }
    });
}
