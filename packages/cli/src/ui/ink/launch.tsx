import React from 'react';
import { render } from 'ink';
import { HomeApp } from './app';
import { ChatApp, type ChatAppProps } from './chat';
import { login as doLogin } from '../../api/auth';
import { runMemoryCommand } from '../../commands/memory';
import { runDeploy } from '../../commands/deploy';
import { runMcpCommand } from '../../commands/mcp';
import { executeRun } from '../../commands/run';
import { createProgram } from '../../cli/program';

async function dispatchHomeCommand(cmd: string, args: string[]): Promise<void> {
  switch (cmd) {
    case 'login':
      await doLogin({});
      break;
    case 'chat':
      await launchChat({});
      break;
    case 'run':
      if (!args.length) throw new Error('Provide a task: run "your task here"');
      await executeRun({ task: args.join(' '), json: false });
      break;
    case 'memory':
      await runMemoryCommand(args[0], args.slice(1), {});
      break;
    case 'deploy':
      await runDeploy({});
      break;
    case 'mcp':
      await runMcpCommand(args[0], args.slice(1), {});
      break;
    case 'help': {
      const program = createProgram();
      program.outputHelp();
      break;
    }
    default:
      throw new Error(`Unknown command: ${cmd}`);
  }
}

export async function launchHome(): Promise<void> {
  const { waitUntilExit } = render(<HomeApp onCommand={dispatchHomeCommand} />);
  await waitUntilExit();
}

export async function launchChat(props: ChatAppProps = {}): Promise<void> {
  const { waitUntilExit } = render(<ChatApp {...props} />);
  await waitUntilExit();
}
