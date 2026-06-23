import type { HyroClient } from '@hyro/sdk';
import { activeToken, loadConfig } from '../config';
import { getClient, isApiReachable, requireAuth } from '../api/client';
import { ensureHyroAgent } from '../lib/ensureAgent';
import { resolveRuntime } from '../runtime/resolveRuntime';
import { runHermesTask } from '../runtime/hermesBridge';
import { CliError, EXIT } from '../lib/errors';
import { renderStep } from '../lib/render';
import { LocalMemory, runLocalTask } from '../runtime/local';
import { theme } from '../theme';
import { info, print, printError } from '../lib/output';

export interface RunOptions {
  task: string;
  agent?: string;
  model?: string;
  maxSteps?: number;
  offline?: boolean;
  json?: boolean;
  onStep?: (step: { type: string; content: Record<string, unknown> }) => void;
}

async function shouldRunOffline(opts: RunOptions): Promise<boolean> {
  if (opts.offline) return true;
  if (!activeToken()) return true;
  return !(await isApiReachable());
}

function runFooter(
  usage: { tokensIn: number; tokensOut: number; costUsd: number; steps: number },
  status: string,
): void {
  print('');
  print(
    theme.dim(
      `  ${status} · ${usage.steps} steps · ${usage.tokensIn}→${usage.tokensOut} tok · $${usage.costUsd.toFixed(4)}`,
    ),
  );
}

async function executeOffline(task: string, opts: RunOptions): Promise<{ finalText: string; steps: number }> {
  const cfg = loadConfig();
  const agentName = opts.agent || cfg.activeAgent || 'HYRO';
  const memory = new LocalMemory(opts.agent || cfg.activeAgent || 'local');
  const steps: { type: string; content: Record<string, unknown> }[] = [];

  if (!opts.json && !opts.onStep) {
    print('');
    print(
      `  ${theme.amber('▸ run')} ${theme.bold(agentName)} ${theme.dim(`· ${opts.model || cfg.model} · offline`)}`,
    );
    print('');
  }

  const { finalText } = await runLocalTask({
    task,
    agentName,
    model: opts.model || cfg.model,
    memory,
    onStep: (e) => {
      steps.push(e);
      opts.onStep?.(e);
      if (!opts.json && !opts.onStep) renderStep(e);
    },
  });

  if (opts.json) {
    print(JSON.stringify({ runtime: 'offline', finalText, steps }, null, 2));
  } else if (!opts.onStep) {
    runFooter({ tokensIn: 0, tokensOut: 0, costUsd: 0, steps: steps.length }, theme.amber('offline'));
  }

  return { finalText, steps: steps.length };
}

async function executeOnline(client: HyroClient, task: string, opts: RunOptions): Promise<{ finalText: string; steps: number }> {
  const ref = opts.agent || loadConfig().activeAgent;
  if (!ref) {
    throw new CliError(
      'No agent selected.',
      EXIT.usage,
      'Pass --agent <slug> or set activeAgent in config.',
    );
  }
  await ensureHyroAgent(client);
  const { agent } = await client.agents.get(ref);

  if (opts.json) {
    const { run } = await client.runs.create({
      agentId: agent.id,
      input: { task },
      ...(opts.model ? { model: opts.model } : {}),
      ...(opts.maxSteps ? { maxSteps: opts.maxSteps } : {}),
      stream: false,
    });
    const full = await client.runs.get(run.id);
    print(JSON.stringify(full, null, 2));
    const finalStep = full.steps.find((s) => s.type === 'final');
    const finalText =
      typeof finalStep?.content === 'object' && finalStep.content && 'text' in finalStep.content
        ? String((finalStep.content as { text?: string }).text ?? '')
        : '';
    return { finalText, steps: full.steps.length };
  }

  if (!opts.json && !opts.onStep) {
    print('');
    print(`  ${theme.amber('▸ run')} ${theme.bold(agent.name)} ${theme.dim(`· ${opts.model || agent.model}`)}`);
    print('');
  }

  const { run } = await client.runs.create({
    agentId: agent.id,
    input: { task },
    ...(opts.model ? { model: opts.model } : {}),
    ...(opts.maxSteps ? { maxSteps: opts.maxSteps } : {}),
    stream: true,
  });

  let finalRun = run;
  let stepCount = 0;
  for await (const evt of client.runs.stream(run.id)) {
    if (evt.type === 'step' && evt.step) {
      stepCount++;
      const step = { type: evt.step.type, content: evt.step.content as Record<string, unknown> };
      opts.onStep?.(step);
      if (!opts.onStep) renderStep(step);
    } else if (evt.type === 'done' && evt.run) {
      finalRun = evt.run;
    } else if (evt.type === 'error') {
      printError(evt.raw);
    }
  }

  if (!opts.onStep) {
    runFooter(
      finalRun.usage,
      finalRun.status === 'succeeded' ? theme.green(finalRun.status) : theme.red(finalRun.status),
    );
  }

  const finalStep = finalRun.output;
  return { finalText: typeof finalStep === 'string' ? finalStep : '', steps: stepCount };
}

/** Execute a task against cloud API or offline runtime. */
export async function executeRun(opts: RunOptions): Promise<{ finalText: string; steps: number }> {
  if (!opts.task.trim()) {
    throw new CliError('Provide a task.', EXIT.usage, 'Example: hyro run "summarize the README"');
  }

  if (!opts.offline && resolveRuntime() === 'hermes') {
    await runHermesTask(opts.task, opts.model);
    return { finalText: '', steps: 0 };
  }

  if (await shouldRunOffline(opts)) {
    if (!opts.json && !opts.onStep && !activeToken()) {
      info('Running offline (not logged in). Use `hyro login` for cloud execution.');
    }
    return executeOffline(opts.task, opts);
  }

  return executeOnline(requireAuth(), opts.task, opts);
}
