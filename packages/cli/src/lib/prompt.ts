/** Minimal interactive prompts built on node:readline. */
import * as readline from 'node:readline';

export function ask(query: string, defaultValue = ''): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

export function askSecret(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (str: string) => {
      if (!muted) process.stdout.write(str);
      else if (str.includes('\n')) process.stdout.write('\n');
    };
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

export async function confirm(query: string, defaultYes = false): Promise<boolean> {
  const suffix = defaultYes ? ' [Y/n] ' : ' [y/N] ';
  const answer = (await ask(query + suffix)).toLowerCase();
  if (!answer) return defaultYes;
  return answer === 'y' || answer === 'yes';
}
