/**
 * HYRO playground seed — governance memory, goals, policies, agents.
 * Schema aligned with packages/api memory (hyro/v1 style).
 */
import type { Goal, MemoryItem, Policy } from '@/lib/playground/types';
import { HYRO_AGENT_META } from '@/lib/hyro-prompt';

const now = Date.now();
const day = 86400000;

export const HYRO_MEMORY: MemoryItem[] = [
  {
    id: 'h-m1',
    type: 'fact',
    content: 'Base Sepolia RPC: https://sepolia.base.org · chain id 84532',
    ts: now - 5 * day,
  },
  {
    id: 'h-m2',
    type: 'fact',
    content: 'B20 tokens are ERC-20 compatible at 0xB200… addresses on Base',
    ts: now - 4 * day,
  },
  {
    id: 'h-m3',
    type: 'preference',
    content: 'Default model: Mimo 2.5 Pro on HYRO VPS',
    ts: now - 3 * day,
  },
  {
    id: 'h-m4',
    type: 'state',
    content: 'MCP: base + dexscreener installed · deny-by-default grants',
    ts: now - day,
  },
  {
    id: 'h-m5',
    type: 'goal',
    content: 'Launch B20 token on Base Sepolia testnet',
    ts: now - 2 * day,
  },
];

export const HYRO_GOALS: Goal[] = [
  {
    id: 'h-g1',
    title: 'Connect Base MCP on VPS',
    deadline: new Date(now + 14 * day).toISOString().slice(0, 10),
    done: false,
    ts: now - 3 * day,
  },
  {
    id: 'h-g2',
    title: 'Ship HYRO playground with live MiMo',
    done: false,
    ts: now - 2 * day,
  },
  {
    id: 'h-g3',
    title: 'Grant dexscreener tools to HYRO agent',
    done: true,
    ts: now - day,
  },
];

export const HYRO_POLICIES: Policy[] = [
  { id: 'h-p1', name: 'deny-by-default MCP', rule: 'Only granted tools may execute', enabled: true },
  { id: 'h-p2', name: 'supervised governance', rule: 'Human approval for send_transaction', enabled: true },
  { id: 'h-p3', name: 'builder attribution', rule: 'Tag onchain actions builderCode=hyro', enabled: true },
];

export interface HyroAgentCard {
  name: string;
  slug: string;
  model: string;
  modelId: string;
  description: string;
  mcp: string[];
}

export const HYRO_AGENTS: HyroAgentCard[] = [
  {
    name: HYRO_AGENT_META.name,
    slug: HYRO_AGENT_META.slug,
    model: 'Mimo 2.5 Pro',
    modelId: 'mimo-2.5-pro',
    description: 'Default HYRO agent — observe, decide, execute, remember on your VPS.',
    mcp: ['base', 'dexscreener', 'github'],
  },
  {
    name: 'Base Onchain',
    slug: 'base-onchain',
    model: 'Claude Sonnet 4.6',
    modelId: 'claude-sonnet-4-6',
    description: 'Base reads, B20 balances, x402 flows, builder codes.',
    mcp: ['base'],
  },
  {
    name: 'Market Intel',
    slug: 'market-intel',
    model: 'Grok 4.20',
    modelId: 'grok-4.20',
    description: 'DexScreener pairs, liquidity, token search on Base.',
    mcp: ['dexscreener'],
  },
  {
    name: 'Code Builder',
    slug: 'builder',
    model: 'GPT-5.2 Codex',
    modelId: 'gpt-5.2-codex',
    description: 'Multi-step coding with MCP tool execution.',
    mcp: ['github', 'filesystem'],
  },
  {
    name: 'Research',
    slug: 'research',
    model: 'Claude Sonnet 4.6',
    modelId: 'claude-sonnet-4-6',
    description: 'Deep research with HYRO memory recall.',
    mcp: ['http'],
  },
];
