/**
 * Local HYRO workspace state for the dashboard TUI: goals, facts, policies,
 * governance mode, and enabled data sources. Persisted at $HYRO_HOME/workspace.json.
 * Offline-first — works with or without the cloud.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HYRO_HOME } from '../config';

export type Governance = 'supervised' | 'autonomous' | 'readonly';

export interface Goal {
  id: string;
  /** VPS memory id when synced to cloud. */
  cloudId?: string;
  name: string;
  progress: number; // 0..100
  deadline?: string; // YYYY-MM-DD
  createdAt: string;
}
export interface Fact {
  id: string;
  cloudId?: string;
  text: string;
  createdAt: string;
}
export interface Policy {
  id: string;
  cloudId?: string;
  rule: string;
  active: boolean;
  createdAt: string;
}

export interface Workspace {
  goals: Goal[];
  facts: Fact[];
  policies: Policy[];
  governance: Governance;
  /** Enabled data-source keys (see DATA_SOURCES). */
  sources: string[];
}

export interface DataSource {
  key: string;
  label: string;
  /** Local sources are always connected; others connect when enabled. */
  local?: boolean;
}

/** Catalog of data sources HYRO agents can pull from (B20/Base-flavored). */
export const DATA_SOURCES: DataSource[] = [
  { key: 'memory', label: 'Memory', local: true },
  { key: 'mcp', label: 'MCP Hub', local: true },
  { key: 'base', label: 'Base / x402' },
  { key: 'coingecko', label: 'CoinGecko' },
  { key: 'dexscreener', label: 'DexScreener' },
  { key: 'github', label: 'GitHub' },
  { key: 'http', label: 'HTTP Fetch' },
  { key: 'hyperliquid', label: 'Hyperliquid' },
];

const WS_PATH = join(HYRO_HOME, 'workspace.json');

const DEFAULT_WS: Workspace = {
  goals: [],
  facts: [],
  policies: [],
  governance: 'supervised',
  sources: ['mcp'],
};

function ensureHome(): void {
  if (!existsSync(HYRO_HOME)) mkdirSync(HYRO_HOME, { recursive: true });
}

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function loadWorkspace(): Workspace {
  try {
    if (!existsSync(WS_PATH)) return { ...DEFAULT_WS };
    return { ...DEFAULT_WS, ...(JSON.parse(readFileSync(WS_PATH, 'utf8')) as Partial<Workspace>) };
  } catch {
    return { ...DEFAULT_WS };
  }
}

export function saveWorkspace(ws: Workspace): Workspace {
  ensureHome();
  writeFileSync(WS_PATH, JSON.stringify(ws, null, 2));
  return ws;
}

export function addGoal(name: string, deadline?: string): Goal {
  const ws = loadWorkspace();
  const goal: Goal = { id: id('goal'), name, progress: 0, deadline, createdAt: new Date().toISOString() };
  ws.goals.push(goal);
  saveWorkspace(ws);
  return goal;
}

export function addFact(text: string): Fact {
  const ws = loadWorkspace();
  const fact: Fact = { id: id('fact'), text, createdAt: new Date().toISOString() };
  ws.facts.push(fact);
  saveWorkspace(ws);
  return fact;
}

export function addPolicy(rule: string): Policy {
  const ws = loadWorkspace();
  const policy: Policy = { id: id('pol'), rule, active: true, createdAt: new Date().toISOString() };
  ws.policies.push(policy);
  saveWorkspace(ws);
  return policy;
}

/** Set goal #n (1-based, as shown in `memory`) to a percent. Returns the goal or null. */
export function setProgress(n: number, percent: number): Goal | null {
  const ws = loadWorkspace();
  const goal = ws.goals[n - 1];
  if (!goal) return null;
  goal.progress = Math.max(0, Math.min(100, Math.round(percent)));
  saveWorkspace(ws);
  return goal;
}

export function setGovernance(mode: Governance): Workspace {
  const ws = loadWorkspace();
  ws.governance = mode;
  return saveWorkspace(ws);
}

export function toggleSource(key: string, on: boolean): Workspace {
  const ws = loadWorkspace();
  const set = new Set(ws.sources);
  if (on) set.add(key);
  else set.delete(key);
  ws.sources = [...set];
  return saveWorkspace(ws);
}

/** Resolve which sources are "connected" (local always; cloud needs a token). */
export function connectedSources(ws: Workspace, hasToken: boolean): Set<string> {
  const set = new Set<string>();
  for (const s of DATA_SOURCES) {
    if (s.local) set.add(s.key);
    else if (ws.sources.includes(s.key)) set.add(s.key);
  }
  if (hasToken) set.add('base'); // cloud unlocks onchain sources
  return set;
}

export function counts(ws: Workspace): { g: number; f: number; p: number } {
  return { g: ws.goals.length, f: ws.facts.length, p: ws.policies.filter((x) => x.active).length };
}
