import { executeRun } from '../commands/run';
import { ask } from '../lib/prompt';
import { print } from '../lib/output';
import { renderBanner } from '../theme';
import { CLI_VERSION } from '../version';
import type { ChatAppProps } from './ink/chat';

/** Simple chat loop for terminals where Ink raw mode fails (e.g. Windows CMD). */
export async function launchReadlineChat({
  agent,
  model,
  offline,
}: ChatAppProps = {}): Promise<void> {
  print(renderBanner(CLI_VERSION));
  print('HYRO chat — type a message or "exit" to leave.\n');

  while (true) {
    const line = await ask('you ❯ ');
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (['exit', 'quit', ':q'].includes(trimmed.toLowerCase())) break;

    try {
      await executeRun({
        task: trimmed,
        agent,
        model,
        offline,
        json: false,
      });
    } catch (err) {
      print(`Error: ${(err as Error).message}`);
    }
    print('');
  }
}
