/**
 * Shared readline chat loop — used by `hyro chat` and dashboard `chat` mode.
 */
import * as readline from 'node:readline';
import { activeToken, loadConfig } from '../config';
import { executeRun } from '../commands/run';
import { print, printError } from '../lib/output';
import { theme, renderBanner } from '../theme';
import { CLI_VERSION } from '../version';

export interface ChatSessionOptions {
  /** Show HYRO banner before the first prompt (standalone `hyro chat`). */
  banner?: boolean;
  /** Called when user leaves chat in embedded mode (dashboard). */
  onLeave?: () => void;
  /**
   * Reuse an existing readline (dashboard). Prevents double-echo when two
   * createInterface() instances share the same stdin/stdout.
   */
  rl?: readline.Interface;
}

export async function runChatSession(options: ChatSessionOptions = {}): Promise<void> {
  const { banner, onLeave, rl: sharedRl } = options;
  const offline = !activeToken();
  const cfg = loadConfig();

  if (banner) {
    print(renderBanner(CLI_VERSION));
    print(theme.dim("Type a message or 'exit' to leave.\n"));
  }

  if (sharedRl) {
    await runEmbeddedChatLoop(sharedRl, offline, cfg.model, onLeave);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  await new Promise<void>((resolve) => {
    const finish = () => {
      rl.removeAllListeners('line');
      rl.close();
      resolve();
    };

    const prompt = () => {
      rl.setPrompt(theme.cyan('you') + theme.dim(' › '));
      rl.prompt();
    };

    rl.on('line', async (raw) => {
      const input = raw.trim();
      if (!input) {
        prompt();
        return;
      }
      if (['exit', 'quit', ':q', 'back'].includes(input.toLowerCase())) {
        if (onLeave) onLeave();
        else print(theme.dim('\nObserve. Decide. Execute. Remember. — bye.'));
        finish();
        return;
      }

      rl.pause();
      print(theme.dim('  …thinking'));
      try {
        const { finalText } = await executeRun({
          task: input,
          model: cfg.model,
          offline,
          json: false,
          onStep: () => {},
        });
        print(`${theme.cyan('hyro')} ${theme.dim('›')} ${theme.ink(finalText || '(no reply)')}`);
      } catch (err) {
        printError((err as Error).message);
      }
      rl.resume();
      prompt();
    });

    rl.on('close', () => resolve());

    prompt();
  });
}

/** Chat inside dashboard — single readline instance, swap line handlers. */
async function runEmbeddedChatLoop(
  rl: readline.Interface,
  offline: boolean,
  model: string,
  onLeave?: () => void,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const prompt = () => {
      rl.setPrompt(theme.cyan('you') + theme.dim(' › '));
      rl.prompt();
    };

    const onLine = async (raw: string) => {
      const input = raw.trim();
      if (!input) {
        prompt();
        return;
      }
      if (['exit', 'quit', ':q', 'back'].includes(input.toLowerCase())) {
        rl.removeListener('line', onLine);
        onLeave?.();
        resolve();
        return;
      }

      rl.pause();
      print(theme.dim('  …thinking'));
      try {
        const { finalText } = await executeRun({
          task: input,
          model,
          offline,
          json: false,
          onStep: () => {},
        });
        print(`${theme.cyan('hyro')} ${theme.dim('›')} ${theme.ink(finalText || '(no reply)')}`);
      } catch (err) {
        printError((err as Error).message);
      }
      rl.resume();
      prompt();
    };

    rl.removeAllListeners('line');
    rl.resume();
    rl.on('line', onLine);
    prompt();
  });
}
