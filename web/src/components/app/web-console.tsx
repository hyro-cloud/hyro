'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Cpu, Database, Network, Terminal } from 'lucide-react';
import { HyroAsciiBanner } from '@/components/brand/hyro-ascii';
import { TerminalChrome, terminalFrameClass } from '@/components/landing/terminal-shell';
import { SITE } from '@/lib/content';
import { HYRO_AGENT_META, HYRO_AGENT_SYSTEM_PROMPT } from '@/lib/hyro-prompt';
import { cn } from '@/lib/utils';

type Tone = 'dim' | 'mute' | 'ink' | 'blue' | 'cyan' | 'green' | 'red';
interface Line {
  id: number;
  kind: 'cmd' | 'out';
  text: string;
  tone?: Tone;
}

const TONE: Record<Tone, string> = {
  dim: 'text-hyro-dim',
  mute: 'text-hyro-mute',
  ink: 'text-hyro-ink',
  blue: 'text-hyro-blue',
  cyan: 'text-hyro-cyan',
  green: 'text-hyro-green',
  red: 'text-hyro-red',
};

const MODELS = [
  'claude-opus-4-8',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'gpt-5',
  'gemini-2.5-pro',
  'openrouter/auto',
];

const AGENTS = [
  { slug: HYRO_AGENT_META.slug, name: HYRO_AGENT_META.name, model: HYRO_AGENT_META.model },
  { slug: 'research', name: 'Research Agent', model: 'claude-sonnet-4-6' },
  { slug: 'crypto', name: 'Crypto Agent', model: 'claude-sonnet-4-6' },
  { slug: 'trading', name: 'Trading Agent', model: 'claude-opus-4-8' },
  { slug: 'builder', name: 'Builder Agent', model: 'claude-opus-4-8' },
  { slug: 'growth', name: 'Growth Agent', model: 'gemini-2.5-pro' },
];

const MCPS = [
  { slug: 'github', tools: 'search_repositories, create_issue' },
  { slug: 'base', tools: 'get_balance, get_token_balance, b20_launch_guide' },
  { slug: 'dexscreener', tools: 'search_pairs, get_pair' },
  { slug: 'http', tools: 'fetch' },
  { slug: 'filesystem', tools: 'read_file, write_file' },
];

const MEM_KEY = 'hyro.console.mem.v1';
interface Mem {
  type: string;
  content: string;
  ts: number;
}

function loadMem(): Mem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(MEM_KEY) || '[]') as Mem[];
  } catch {
    return [];
  }
}
function saveMem(items: Mem[]) {
  try {
    localStorage.setItem(MEM_KEY, JSON.stringify(items.slice(-200)));
  } catch {
    /* storage may be blocked */
  }
}
function addMem(type: string, content: string) {
  const items = loadMem();
  items.push({ type, content, ts: Date.now() });
  saveMem(items);
}
function searchMem(query: string, k = 3): { content: string; type: string; score: number }[] {
  const q = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  return loadMem()
    .map((m) => {
      const text = m.content.toLowerCase();
      let score = 0;
      for (const w of q) if (text.includes(w)) score += 1;
      if (text.includes(query.toLowerCase())) score += 1.5;
      return { content: m.content, type: m.type, score: score / (q.length || 1) };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const QUICK = [
  'help',
  'dashboard',
  'status',
  'mcp',
  'b20',
  'bankr',
  'run "check B20 balance on Base Sepolia"',
];

let LINE_ID = 0;

export function WebConsole() {
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-6');
  const [busy, setBusy] = useState(false);
  const [memCount, setMemCount] = useState(0);
  const history = useRef<string[]>([]);
  const histIdx = useRef<number>(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const booted = useRef(false);

  const push = useCallback((text: string, tone: Tone = 'mute') => {
    setLines((prev) => [...prev, { id: ++LINE_ID, kind: 'out', text, tone }]);
  }, []);
  const pushCmd = useCallback((text: string) => {
    setLines((prev) => [...prev, { id: ++LINE_ID, kind: 'cmd', text }]);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  useEffect(() => setMemCount(loadMem().length), []);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    push('HYRO Agent Studio — local runtime. Install CLI for real dashboard + VPS brain.', 'dim');
    push(`API: ${SITE.apiUrl} · B20 · Base MCP · x402 · Bankr`, 'dim');
    push('Type `help`, `dashboard`, or run "<task>".', 'dim');
    push('', 'dim');
  }, [push]);

  const runTask = useCallback(
    async (task: string) => {
      setBusy(true);
      let steps = 0;
      const tok = () => 180 + Math.floor(Math.random() * 220);
      let used = 0;

      push('  ○ observe   assembling context + tools', 'dim');
      await delay(360);
      push('  → tool      memory_search', 'cyan');
      await delay(280);
      const hits = searchMem(task, 3);
      if (hits.length) {
        push('  ← result    ' + hits.map((h) => `[${h.type}] ${h.content}`).join(' · '), 'dim');
      } else {
        push('  ← result    no relevant memories yet', 'dim');
      }
      used += tok();
      steps += 1;
      await delay(360);

      push('  ◆ decide    planning approach + selecting tools', 'blue');
      used += tok();
      steps += 1;
      await delay(420);

      if (/pay|price|token|swap|usdc|base|x402|wallet|trade|onchain|eth|sol/i.test(task)) {
        push('  → tool      dexscreener__search_pairs', 'cyan');
        await delay(360);
        push('  ← result    ETH/USDC · $3,142.50 · liq $48.2M · 24h +2.1%', 'dim');
        steps += 1;
        await delay(320);
        push('  → tool      base__x402_pay  (USDC on Base)', 'cyan');
        await delay(420);
        push('  ← result    ✔ settled on Base · 0.01 USDC · builderCode=hyro', 'green');
        steps += 1;
        used += tok();
        await delay(360);
      }

      push('  → tool      think', 'cyan');
      await delay(260);
      steps += 1;

      push('  ✔ final', 'green');
      const answer = composeAnswer(task, hits.length > 0);
      for (const ln of answer) {
        push('              ' + ln, 'ink');
        await delay(90);
      }
      used += tok();

      addMem('conversation', `Task: ${task.slice(0, 120)}`);
      setMemCount(loadMem().length);

      push('', 'dim');
      push(
        `  succeeded · ${steps} steps · ~${used}→${Math.floor(used * 0.5)} tok · $${(used * 0.000009).toFixed(4)} · ${model}`,
        'dim',
      );
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [model, push],
  );

  const execute = useCallback(
    async (raw: string) => {
      const line = raw.trim();
      if (!line) return;
      pushCmd(line);
      if (line !== history.current[history.current.length - 1]) history.current.push(line);
      histIdx.current = -1;

      const [cmd, ...rest] = line.split(/\s+/);
      const argstr = rest.join(' ');
      const quoted = line.match(/"([^"]+)"|'([^']+)'/);
      const arg = quoted ? quoted[1] || quoted[2] || '' : argstr;

      switch ((cmd || '').toLowerCase()) {
        case 'help':
          HELP.forEach((h) => push(`  ${h[0].padEnd(22)} ${h[1]}`, 'mute'));
          break;
        case 'clear':
        case 'cls':
          setLines([]);
          break;
        case 'banner':
          push('HYRO TERMINAL · v' + SITE.version, 'blue');
          break;
        case 'status':
          push(`  model     ${model}`, 'mute');
          push('  network   base sepolia · x402 USDC', 'mute');
          push('  mcp       github · base · dexscreener · http', 'mute');
          push('  sources   6/8 connected (see `dashboard`)', 'mute');
          push(`  memory    ${loadMem().length} items (local)`, 'mute');
          break;
        case 'dashboard':
          push('  Open the real dashboard: run `hyro` in your terminal after CLI install.', 'ink');
          push('  Preview shown above ↑ — STATUS · CONNECTED SOURCES · hyro ›', 'dim');
          break;
        case 'whoami':
          push('  guest@hyro · local session', 'mute');
          break;
        case 'about':
          push('  HYRO Cloud — the Operating System for Autonomous Agents.', 'ink');
          push('  This web console runs the local runtime. Install the CLI for', 'mute');
          push('  full MCP + cloud execution: npm install -g hyro', 'mute');
          break;
        case 'install':
          push('  # From GitHub (full MCP + CLI):', 'dim');
          push('  ' + SITE.installFromGit, 'blue');
          push('  hyro', 'dim');
          push('  hyro run "your task" --offline', 'dim');
          break;
        case 'github':
          push('  ' + SITE.github, 'blue');
          push('  clone → npm install → npm run build → npm install -g ./packages/cli', 'dim');
          break;
        case 'prompt':
          HYRO_AGENT_SYSTEM_PROMPT.split('\n').forEach((ln) => push('  ' + ln, ln.startsWith('##') ? 'blue' : 'mute'));
          break;
        case 'login':
          push('  ↗ Cloud auth happens in the CLI: `hyro login`.', 'mute');
          push('  This console is the local runtime — no key required.', 'dim');
          break;
        case 'model':
          if (rest[0] === 'use' && rest[1]) {
            const want = rest[1].toLowerCase();
            const found = MODELS.find((m) => m === want || m.includes(want));
            if (found) {
              setModel(found);
              push(`  ✔ active model set to ${found}`, 'green');
            } else {
              push(`  unknown model: ${rest[1]} — try \`model list\``, 'red');
            }
          } else if (rest[0] === 'list' || rest.length === 0) {
            push(`  active: ${model}`, 'blue');
            MODELS.forEach((m) => push(`    ${m === model ? '●' : ' '} ${m}`, 'mute'));
          }
          break;
        case 'models':
          MODELS.forEach((m) => push(`    ${m === model ? '●' : ' '} ${m}`, 'mute'));
          break;
        case 'agents':
          AGENTS.forEach((a) => push(`  ${a.slug.padEnd(10)} ${a.name.padEnd(16)} ${a.model}`, 'mute'));
          break;
        case 'mcp':
          if (rest[0] === 'search' && rest[1]) {
            MCPS.filter((m) => m.slug.includes(rest[1]!.toLowerCase())).forEach((m) =>
              push(`  ${m.slug.padEnd(12)} ${m.tools}`, 'mute'),
            );
          } else {
            MCPS.forEach((m) => push(`  ${m.slug.padEnd(12)} ${m.tools}`, 'mute'));
          }
          break;
        case 'memory':
        case 'mem': {
          const sub = (rest[0] || '').toLowerCase();
          if (sub === 'add' && arg) {
            addMem('fact', arg);
            setMemCount(loadMem().length);
            push('  ✔ stored memory', 'green');
          } else if (sub === 'search' && arg) {
            const hits = searchMem(arg, 6);
            if (!hits.length) push('  no matches', 'dim');
            hits.forEach((h) => push(`  ${h.score.toFixed(2)} [${h.type}] ${h.content}`, 'mute'));
          } else if (sub === 'clear') {
            saveMem([]);
            setMemCount(0);
            push('  ✔ memory cleared', 'green');
          } else {
            const items = loadMem();
            if (!items.length) push('  (empty) — add with: memory add "<text>"', 'dim');
            items.slice(-12).forEach((m) => push(`  [${m.type}] ${m.content}`, 'mute'));
          }
          break;
        }
        case 'base':
        case 'b20':
        case 'x402':
          push('  HYRO B20 — Base native tokens + x402 USDC on Base.', 'ink');
          push('  MCP: connect base → b20_launch_guide, get_token_balance', 'mute');
          push('  Docs: ' + SITE.b20Docs, 'blue');
          push('  Open /b20 on this site for the full studio.', 'dim');
          break;
        case 'bankr':
          push('  Bankr — onchain agent payments (USDC on Base).', 'ink');
          push('  HYRO x402 flows are Bankr-compatible.', 'mute');
          push('  ' + SITE.bankr, 'blue');
          break;
        case 'run':
        case 'r':
          if (!arg) {
            push('  usage: run "<task>"', 'red');
          } else {
            await runTask(arg);
          }
          break;
        case 'echo':
          push('  ' + argstr, 'mute');
          break;
        default:
          push(`  command not found: ${cmd} — type \`help\``, 'red');
      }
    },
    [model, push, pushCmd, runTask],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (busy) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') {
      const v = input;
      setInput('');
      void execute(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const h = history.current;
      if (!h.length) return;
      histIdx.current = histIdx.current < 0 ? h.length - 1 : Math.max(0, histIdx.current - 1);
      setInput(h[histIdx.current] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const h = history.current;
      if (histIdx.current < 0) return;
      histIdx.current = histIdx.current + 1;
      if (histIdx.current >= h.length) {
        histIdx.current = -1;
        setInput('');
      } else {
        setInput(h[histIdx.current] || '');
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatBadge icon={<Cpu className="h-3 w-3" />} label="model" value={model} />
        <StatBadge icon={<Network className="h-3 w-3" />} label="chain" value="base · sepolia" />
        <StatBadge icon={<Database className="h-3 w-3" />} label="mcp" value="6 connected" />
        <StatBadge icon={<Terminal className="h-3 w-3" />} label="mode" value="web + hyro TUI" />
      </div>

      <div
        className={cn(
          'flex h-[68vh] min-h-[520px] max-h-[760px] flex-col overflow-hidden',
          terminalFrameClass,
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <TerminalChrome title={`hyro@studio — web console — ${SITE.version}`} />

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 font-mono text-[12.5px] leading-relaxed sm:px-5 sm:text-[13px]"
          aria-live="polite"
        >
          <HyroAsciiBanner version={SITE.version} />
          {lines.map((l) =>
            l.kind === 'cmd' ? (
              <div key={l.id} className="whitespace-pre-wrap break-words">
                <span className="text-hyro-blue">hyro ❯ </span>
                <span className="text-hyro-ink">{l.text}</span>
              </div>
            ) : (
              <div key={l.id} className={cn('whitespace-pre-wrap break-words', TONE[l.tone || 'mute'])}>
                {l.text || ' '}
              </div>
            ),
          )}

          <div className="flex items-center whitespace-pre-wrap">
            <span className="text-hyro-blue">hyro ❯ </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              disabled={busy}
              className="flex-1 border-0 bg-transparent p-0 font-mono text-[12.5px] text-hyro-ink caret-hyro-blue outline-none placeholder:text-hyro-faint sm:text-[13px]"
              placeholder={busy ? 'running…' : 'type a command — e.g. run "summarize my notes"'}
              aria-label="console input"
            />
            {busy && <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border border-hyro-blue/40 border-t-hyro-blue" />}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => {
              setInput('');
              void execute(q);
              inputRef.current?.focus();
            }}
            className="max-w-full truncate rounded-md border border-hyro-line/80 bg-hyro-panel/40 px-2.5 py-1.5 font-mono text-[11px] text-hyro-mute transition hover:border-hyro-blue/60 hover:text-hyro-blue disabled:opacity-40"
          >
            {q.length > 40 ? q.slice(0, 39) + '…' : q}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-hyro-line/80 bg-hyro-panel/40 px-2.5 py-1 font-mono text-[11px] text-hyro-mute">
      <span className="text-hyro-blue">{icon}</span>
      <span className="text-hyro-dim">{label}</span>
      <span className="text-hyro-ink">{value}</span>
    </span>
  );
}

const HELP: [string, string][] = [
  ['help', 'list commands'],
  ['dashboard', 'about the real hyro TUI'],
  ['run "<task>"', 'execute an agent run (streamed)'],
  ['status', 'model · network · mcp · memory'],
  ['mcp [search <q>]', 'list MCP servers (base, github, …)'],
  ['b20 | x402 | base', 'B20 + Base MCP info'],
  ['bankr', 'Bankr onchain agent payments'],
  ['install', 'clone & install CLI from GitHub'],
  ['memory [add|search|clear]', 'local in-browser memory'],
  ['clear', 'clear the screen'],
];

function composeAnswer(task: string, hadMemory: boolean): string[] {
  const t = task.length > 90 ? task.slice(0, 87) + '…' : task;
  const out = [`Completed: ${t}`];
  if (/pay|price|usdc|x402|base|swap|trade|onchain/i.test(task)) {
    out.push('Settled the payment in USDC on Base via x402; attribution tagged');
    out.push('with builderCode=hyro (ERC-8021). Receipt persisted to memory.');
  } else {
    out.push('Synthesized a result from context' + (hadMemory ? ' and prior memory' : ''));
    out.push('and persisted the outcome for future recall.');
  }
  out.push('Install from GitHub for real MCP + cloud:');
  out.push('  ' + SITE.installFromGit);
  return out;
}
