/**
 * HYRO Dashboard — cross-platform TUI home (plain ANSI + readline, Windows-safe).
 * Goals/facts/policies sync to VPS memory when logged in.
 */
import * as readline from 'node:readline';
import { getModel } from '@hyro/core';
import { activeToken, loadConfig, saveConfig } from '../config';
import { print, printError, success } from '../lib/output';
import { theme, renderLogo } from '../theme';
import {
  DATA_SOURCES,
  loadWorkspace,
  setGovernance,
  type Governance,
} from '../lib/workspace';
import {
  connectMcpSource,
  disconnectMcpSource,
  resolveConnectedSources,
  autoConnectFreeSources,
} from '../lib/sourceConnect';
import {
  addFact,
  addGoal,
  addPolicy,
  fetchMemorySnapshot,
  memoryCounts,
  setProgress,
  type MemorySnapshot,
} from '../lib/workspaceMemory';
import { runChatSession } from './chat-session';

const ANSI = /\x1b\[[0-9;]*m/g;
const vlen = (s: string) => s.replace(ANSI, '').length;
const padV = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - vlen(s)));
const center = (s: string, w: number) => {
  const pad = Math.max(0, w - vlen(s));
  const left = Math.floor(pad / 2);
  return ' '.repeat(left) + s + ' '.repeat(pad - left);
};
const dot = (on: boolean) => (on ? theme.green('●') : theme.faint('○'));

function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
}

function providerLabel(model: string): string {
  const info = getModel(model);
  switch (info?.provider) {
    case 'anthropic':
      return 'Anthropic Claude';
    case 'openai':
      return 'OpenAI';
    case 'gemini':
      return 'Google Gemini';
    case 'openrouter':
      return 'OpenRouter';
    case 'mimo':
      return 'Xiaomi MiMo';
    default:
      return 'Local runtime';
  }
}

const WIDTH = Math.max(72, Math.min(process.stdout.columns ?? 96, 100));
const LEFT_W = 36;

export async function renderDashboard(memory?: MemorySnapshot): Promise<string> {
  const cfg = loadConfig();
  const ws = loadWorkspace();
  const snap = memory ?? (await fetchMemorySnapshot());
  const c = memoryCounts(snap);
  const hasToken = Boolean(activeToken());
  const connected = await resolveConnectedSources(hasToken);

  const status = (label: string, value: string) =>
    `  ${theme.green('●')} ${theme.ink(label.padEnd(13))} ${value}`;
  const memLabel = snap.cloud ? 'Memory (cloud)' : 'Memory (local)';
  const left = [
    theme.bold(theme.amber('STATUS')),
    status('LLM', theme.amber(cfg.model)),
    status(memLabel, `${theme.amberHi(`${c.g}g`)} ${theme.amberHi(`${c.f}f`)} ${theme.amberHi(`${c.p}p`)}`),
    status('Governance', theme.cyan(ws.governance)),
    status('Data Sources', `${theme.amberHi(`${connected.size}/${DATA_SOURCES.length}`)} connected`),
  ];

  const cmd = (name: string, desc: string) =>
    `${theme.bold(theme.amberHi(name.padEnd(18)))}${theme.dim(desc)}`;
  const right = [
    theme.bold(theme.amber('COMMANDS')),
    cmd('chat', 'Start AI conversation'),
    cmd('memory', 'View goals, facts & policies'),
    cmd('add goal <name>', 'Add a goal  [--deadline YYYY-MM-DD]'),
    cmd('add fact <text>', 'Store a fact'),
    cmd('add policy <rule>', 'Activate a policy rule'),
    cmd('progress <n> <n%>', 'Update goal progress'),
    cmd('governance', 'View / set governance'),
    cmd('setup', 'Configure LLM & data sources'),
    cmd('exit', 'Quit HYRO'),
  ];

  const out: string[] = [''];
  out.push(renderLogo());
  out.push('');
  const rows = Math.max(left.length, right.length);
  for (let i = 0; i < rows; i++) {
    out.push(padV(left[i] ?? '', LEFT_W) + (right[i] ?? ''));
  }

  out.push('');
  out.push(center(theme.bold(theme.amber('CONNECTED SOURCES')), WIDTH));
  const cellW = Math.floor(WIDTH / 4);
  for (let i = 0; i < DATA_SOURCES.length; i += 4) {
    const cells = DATA_SOURCES.slice(i, i + 4).map((s) => {
      const on = connected.has(s.key);
      const label = s.comingSoon
        ? theme.faint(`${s.label} (soon)`)
        : on
          ? theme.ink(s.label)
          : theme.dim(s.label);
      return padV(`${dot(on)} ${label}`, cellW);
    });
    out.push('  ' + cells.join(''));
  }

  out.push('');
  out.push(theme.amberDim('─'.repeat(WIDTH)));
  const provider = providerLabel(cfg.model);
  const ready = hasToken ? `${provider} · cloud` : `${provider} · local`;
  const memHint = snap.cloud ? theme.dim('memory synced to VPS') : theme.dim('login to sync memory to VPS');
  out.push(
    `  ${theme.green(ready + ' ready')}    ${theme.dim('type')} ${theme.amber('chat')} ${theme.dim('to begin')}    ${theme.amber('/help')} ${theme.dim('for all commands')}`,
  );
  out.push(`  ${memHint}`);
  out.push('');
  return out.join('\n');
}

async function renderMemory(): Promise<void> {
  const snap = await fetchMemorySnapshot();
  print('');
  print(theme.bold(theme.amber('GOALS')) + (snap.cloud ? theme.dim('  (VPS)') : theme.dim('  (local)')));
  if (!snap.goals.length) print(theme.dim('  (none) — add with: add goal <name>'));
  snap.goals.forEach((g, i) => {
    const bar = '█'.repeat(Math.round(g.progress / 10)) + '░'.repeat(10 - Math.round(g.progress / 10));
    print(
      `  ${theme.amber(String(i + 1).padStart(2))}. ${theme.ink(g.name.padEnd(28))} ${theme.green(bar)} ${theme.amberHi(`${g.progress}%`)}${g.deadline ? theme.dim(`  ⏿ ${g.deadline}`) : ''}`,
    );
  });
  print('');
  print(theme.bold(theme.amber('FACTS')));
  if (!snap.facts.length) print(theme.dim('  (none) — add with: add fact <text>'));
  snap.facts.forEach((f, i) => print(`  ${theme.amber(String(i + 1).padStart(2))}. ${theme.mute(f.text)}`));
  print('');
  print(theme.bold(theme.amber('POLICIES')));
  if (!snap.policies.length) print(theme.dim('  (none) — add with: add policy <rule>'));
  snap.policies.forEach((p, i) =>
    print(`  ${theme.amber(String(i + 1).padStart(2))}. ${dot(p.active)} ${theme.mute(p.rule)}`),
  );
  print('');
}

async function renderSetup(): Promise<void> {
  const cfg = loadConfig();
  const connected = await resolveConnectedSources(Boolean(activeToken()));
  print('');
  print(theme.bold(theme.amber('SETUP')));
  print(`  ${theme.dim('LLM model')}    ${theme.amber(cfg.model)}   ${theme.dim('→ setup model <id>')}`);
  print(`  ${theme.dim('API url')}      ${theme.mute(cfg.apiUrl)}   ${theme.dim('→ setup api <url>')}`);
  print(
    `  ${theme.dim('Auth')}         ${activeToken() ? theme.green('logged in — memory syncs to VPS') : theme.dim('guest — run `hyro login`')}`,
  );
  print('');
  print(
    theme.bold(theme.amber('DATA SOURCES')) +
      theme.dim('  → connect <key> installs MCP on VPS · disconnect removes it'),
  );
  for (const s of DATA_SOURCES) {
    const on = connected.has(s.key);
    const hint = s.comingSoon
      ? theme.faint('  (coming soon)')
      : s.setupHint
        ? theme.faint(`  (${s.setupHint})`)
        : s.local
          ? theme.faint('  (built-in)')
          : on
            ? theme.green('  (MCP active)')
            : theme.dim('  → connect ' + s.key);
    print(`  ${dot(on)} ${theme.ink(s.key.padEnd(13))} ${theme.dim(s.label)}${hint}`);
  }
  print('');
}

function renderHelp(): void {
  print('');
  print(theme.bold(theme.amber('ALL COMMANDS')));
  const rows: [string, string][] = [
    ['chat', 'enter an AI conversation (type `back` to return)'],
    ['memory', 'list goals, facts & policies (VPS when logged in)'],
    ['add goal <name> [--deadline d]', 'create a goal (stored in agent memory)'],
    ['add fact <text>', 'store a fact in agent memory'],
    ['add policy <rule>', 'activate a policy rule'],
    ['progress <n> <n%>', 'set goal #n progress'],
    ['governance [supervised|autonomous|readonly]', 'view / set governance (local)'],
    ['sources', 'list data sources'],
    ['connect <key> / disconnect <key>', 'toggle a data source'],
    ['setup [model <id> | api <url>]', 'configure runtime'],
    ['model <id>', 'switch the active model'],
    ['status / clear', 're-render the dashboard'],
    ['help / exit', 'this help / quit'],
  ];
  for (const [k, v] of rows) print(`  ${theme.amberHi(k.padEnd(44))}${theme.dim(v)}`);
  print('');
}

export async function runDashboard(): Promise<void> {
  if (activeToken()) {
    try {
      await autoConnectFreeSources();
    } catch {
      /* VPS registry may need seed — connect manually */
    }
  }

  clearScreen();
  process.stdout.write((await renderDashboard()) + '\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let exited = false;
  const queue: string[] = [];
  let processing = false;

  const setPrompt = () => {
    if (exited) return;
    rl.setPrompt(theme.amber('hyro') + theme.dim(' › '));
    rl.prompt();
  };

  const rerender = async () => {
    clearScreen();
    process.stdout.write((await renderDashboard()) + '\n');
  };

  async function enterChat(): Promise<void> {
    print(theme.dim("  entered chat — type 'back' to return"));
    rl.pause();
    await runChatSession({
      onLeave: () => print(theme.dim('  ← back to dashboard')),
    });
    rl.resume();
    if (!exited) setPrompt();
  }

  async function processLine(raw: string): Promise<void> {
    const input = raw.trim();
    if (!input) return;

    try {
      const done = await handleCommand(input, rerender);
      if (done === 'exit') exited = true;
      else if (done === 'chat') await enterChat();
    } catch (err) {
      printError((err as Error).message);
    }
  }

  async function drain(): Promise<void> {
    if (processing) return;
    processing = true;
    while (queue.length && !exited) {
      await processLine(queue.shift()!);
    }
    processing = false;
    if (exited) rl.close();
    else setPrompt();
  }

  setPrompt();
  await new Promise<void>((resolve) => {
    rl.on('line', (line) => {
      queue.push(line);
      void drain();
    });
    rl.on('close', () => {
      print(theme.dim('\nObserve. Decide. Execute. Remember. — bye.'));
      resolve();
    });
  });
}

type CommandResult = void | 'exit' | 'chat';

async function handleCommand(input: string, rerender: () => Promise<void>): Promise<CommandResult> {
  if (!input) return;
  const lower = input.toLowerCase();
  const parts = input.split(/\s+/);
  const head = parts[0]!.toLowerCase();

  if (lower === 'exit' || lower === 'quit') return 'exit';
  if (lower === 'help' || lower === '/help') return renderHelp();
  if (lower === 'clear' || lower === 'cls' || lower === 'status' || lower === 'dashboard' || lower === 'home')
    return void (await rerender());
  if (lower === 'chat') return 'chat';
  if (lower === 'memory' || lower === 'mem') return void (await renderMemory());
  if (lower === 'setup') return void (await renderSetup());
  if (lower === 'sources') return void (await renderSetup());

  if (head === 'governance') {
    const mode = parts[1]?.toLowerCase();
    if (mode && ['supervised', 'autonomous', 'readonly'].includes(mode)) {
      setGovernance(mode as Governance);
      success(`Governance set to ${theme.cyan(mode)}.`);
      await rerender();
    } else if (mode) {
      printError('governance must be: supervised | autonomous | readonly');
    } else {
      const ws = loadWorkspace();
      print('');
      print(`  ${theme.dim('Governance')}  ${theme.cyan(ws.governance)}`);
      print(theme.dim('  supervised = confirm before tools · autonomous = auto · readonly = no tools'));
      print(theme.dim('  change: governance <mode>'));
      print('');
    }
    return;
  }

  if (head === 'add') {
    const kind = parts[1]?.toLowerCase();
    const rest = parts.slice(2).join(' ').trim();
    if (kind === 'goal') {
      if (!rest) return void printError('Usage: add goal <name> [--deadline YYYY-MM-DD]');
      const m = rest.match(/--deadline\s+(\d{4}-\d{2}-\d{2})/);
      const name = rest.replace(/--deadline\s+\d{4}-\d{2}-\d{2}/, '').trim();
      const g = await addGoal(name, m?.[1]);
      success(`Goal added: ${theme.ink(g.name)}${g.deadline ? theme.dim(` (by ${g.deadline})`) : ''}`);
      await rerender();
    } else if (kind === 'fact') {
      if (!rest) return void printError('Usage: add fact <text>');
      await addFact(rest);
      success('Fact stored.');
      await rerender();
    } else if (kind === 'policy') {
      if (!rest) return void printError('Usage: add policy <rule>');
      await addPolicy(rest);
      success('Policy activated.');
      await rerender();
    } else {
      printError('Usage: add goal|fact|policy <…>');
    }
    return;
  }

  if (head === 'progress') {
    const n = Number(parts[1]);
    const pct = Number((parts[2] ?? '').replace('%', ''));
    if (!Number.isFinite(n) || !Number.isFinite(pct)) return void printError('Usage: progress <n> <n%>');
    const g = await setProgress(n, pct);
    if (!g) return void printError(`No goal #${n}. Run \`memory\` to list goals.`);
    success(`${theme.ink(g.name)} → ${theme.amberHi(`${g.progress}%`)}`);
    await rerender();
    return;
  }

  if (head === 'connect' || head === 'disconnect') {
    const key = parts[1]?.toLowerCase();
    if (!key || !DATA_SOURCES.some((s) => s.key === key))
      return void printError(`Unknown source. Try: ${DATA_SOURCES.map((s) => s.key).join(', ')}`);
    if (head === 'connect') {
      await connectMcpSource(key);
      success(`${key} connected (MCP installed on VPS).`);
    } else {
      await disconnectMcpSource(key);
      success(`${key} disconnected.`);
    }
    await rerender();
    return;
  }

  if (head === 'model' || (head === 'setup' && parts[1] === 'model')) {
    const id = head === 'model' ? parts[1] : parts[2];
    if (!id) return void printError('Usage: model <id>  (e.g. mimo-chat, claude-sonnet-4-6)');
    const info = getModel(id);
    if (!info) return void printError(`Unknown model: ${id}`);
    saveConfig({ model: info.id });
    success(`Active model → ${theme.amber(info.id)}`);
    await rerender();
    return;
  }

  if (head === 'setup' && parts[1] === 'api') {
    const url = parts[2];
    if (!url) return void printError('Usage: setup api <url>');
    saveConfig({ apiUrl: url });
    success(`API url → ${url}`);
    await rerender();
    return;
  }

  if (lower === 'login') {
    print(theme.dim('  Run in a normal shell:  hyro login --register'));
    return;
  }

  printError(`Unknown command: ${head} — type ${theme.amber('/help')}`);
}
