/** Static content for the HYRO landing page. Single source of truth. */

export const SITE = {
  name: 'HYRO Cloud',
  tagline: 'The Operating System for Autonomous Agents',
  description:
    'A terminal-first cloud runtime to create, deploy, execute and monitor autonomous AI agents — with tools, persistent memory and native MCP connectivity.',
  /** Rich description for Open Graph, Twitter Cards, and link previews (English). */
  shareDescription:
    'HYRO Cloud is the operating system for autonomous agents. Install the hyro CLI, open the dashboard TUI, sync memory to your VPS brain, and connect Base MCP (B20 tokens, x402 USDC), GitHub, DexScreener, and Bankr-ready onchain flows. Open source · MiMo · pgvector memory · deny-by-default MCP.',
  ogImage: '/logo.jpg',
  url: 'https://hyrocloud.lol',
  domain: 'hyrocloud.lol',
  apiUrl: 'https://api.hyrocloud.lol',
  github: 'https://github.com/hyro-cloud/hyro',
  githubClone: 'https://github.com/hyro-cloud/hyro.git',
  x: 'https://x.com/HyroCloud',
  install: 'npm install -g ./packages/cli',
  installFromGit:
    'git clone https://github.com/hyro-cloud/hyro.git && cd hyro && npm install && npm run build && npm install -g ./packages/cli',
  version: '0.1.0',
  // Base / x402 references
  x402Docs: 'https://docs.cdp.coinbase.com/x402/core-concepts/builder-codes',
  baseAnnouncement: 'https://x.com/buildonbase/status/2067693904909189141',
  baseDevBlog: 'https://blog.base.dev/builder-codes-and-erc-8021-fixing-onchain-attribution',
  baseBuilderDocs: 'https://docs.base.org/base-chain/quickstart/builder-codes',
  b20Docs: 'https://docs.base.org/get-started/launch-b20-token',
  bankr: 'https://bankr.bot',
};

export interface NavLink {
  href: string;
  label: string;
  /** B20 — highlighted as the live integration we ship */
  highlight?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/#mcp', label: 'MCP' },
  { href: '/#cli', label: 'CLI' },
  { href: '/#roadmap', label: 'Roadmap' },
  { href: '/b20', label: 'B20', highlight: true },
];

export const MANTRA = ['Observe', 'Decide', 'Execute', 'Remember'];

export const TICKER = [
  'CLI-first',
  'HYRO Dashboard TUI',
  'B20 on Base',
  'Base MCP',
  'x402 USDC',
  'Bankr agents',
  'Native MCP',
  'DexScreener',
  'GitHub tools',
  'pgvector memory',
  'MiMo · Anthropic · OpenAI',
  'Agent marketplace',
  'One-command deploy',
];

/** Live integrations shown on landing + launch studio */
export const INTEGRATIONS = [
  {
    id: 'b20',
    label: 'B20',
    tag: 'Native Base token standard',
    href: '/b20',
    internal: true,
  },
  {
    id: 'base-mcp',
    label: 'Base MCP',
    tag: 'get_balance · B20 · launch guide',
    href: '/base',
    internal: true,
  },
  {
    id: 'x402',
    label: 'x402',
    tag: 'USDC pay-per-call on Base',
    href: '/b20',
    internal: true,
  },
  {
    id: 'bankr',
    label: 'Bankr',
    tag: 'Onchain agent payments',
    href: SITE.bankr,
    internal: false,
  },
] as const;

/** CONNECTED SOURCES grid — mirrors real `hyro` dashboard */
export const CONNECTED_SOURCES = [
  { key: 'memory', label: 'Memory', connected: true, soon: false },
  { key: 'mcp', label: 'MCP Hub', connected: true, soon: false },
  { key: 'base', label: 'Base / B20 / x402', connected: true, soon: false },
  { key: 'coingecko', label: 'CoinGecko', connected: false, soon: true },
  { key: 'dexscreener', label: 'DexScreener', connected: true, soon: false },
  { key: 'github', label: 'GitHub', connected: true, soon: false },
  { key: 'http', label: 'HTTP Fetch', connected: true, soon: false },
  { key: 'hyperliquid', label: 'Hyperliquid', connected: false, soon: true },
] as const;

export type IconKey =
  | 'Terminal'
  | 'Server'
  | 'Plug'
  | 'Database'
  | 'GitBranch'
  | 'LayoutGrid';

export interface Feature {
  idx: string;
  icon: IconKey;
  title: string;
  desc: string;
}

export const FEATURES: Feature[] = [
  {
    idx: '01',
    icon: 'Terminal',
    title: 'Terminal-first CLI',
    desc: 'A hacker-grade blue terminal with a live REPL and one-shot commands. The CLI is the product.',
  },
  {
    idx: '02',
    icon: 'Server',
    title: 'Cloud runtime',
    desc: 'Agents run as durable, observable runs. Every step is streamed over SSE and fully replayable.',
  },
  {
    idx: '03',
    icon: 'Plug',
    title: 'Native MCP',
    desc: 'Install Model Context Protocol servers; HYRO discovers tools and exposes them — deny-by-default.',
  },
  {
    idx: '04',
    icon: 'Database',
    title: 'Memory engine',
    desc: 'Facts, goals, preferences, conversations and state in PostgreSQL + pgvector with semantic recall.',
  },
  {
    idx: '05',
    icon: 'GitBranch',
    title: 'Multi-model',
    desc: 'Anthropic, OpenAI, Gemini and OpenRouter behind one interface. Switch with a single command.',
  },
  {
    idx: '06',
    icon: 'LayoutGrid',
    title: 'Marketplace',
    desc: 'Publish, discover and install agents — Research, Crypto, Growth, Trading and Builder out of the box.',
  },
];

export const MEMORY_TYPES = ['fact', 'goal', 'preference', 'conversation', 'state'];

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ: FaqItem[] = [
  {
    q: 'Is HYRO a chatbot?',
    a: 'No. HYRO is an agent operating system — a runtime where agents have identity, tools, memory and a lifecycle. A run is one execution of an agent, fully persisted and replayable.',
  },
  {
    q: 'Do I need API keys to try it?',
    a: 'No. The CLI runs offline with a deterministic local runtime and a local embedder, so `hyro run` works with zero keys. Add provider keys or log in for full cloud execution.',
  },
  {
    q: 'Which models are supported?',
    a: 'Anthropic (Claude Opus 4.8, Sonnet 4.6, Haiku 4.5, Fable 5), OpenAI (GPT-5 family), Google Gemini 2.5, and anything on OpenRouter. Switch with `hyro model use <id>`.',
  },
  {
    q: 'How does MCP work in HYRO?',
    a: 'Install an MCP server from the registry, then grant specific tools to an agent. At runtime HYRO performs the MCP handshake, discovers tools, and proxies tools/call — sandboxed and deny-by-default.',
  },
  {
    q: 'Where does memory live?',
    a: 'In PostgreSQL with the pgvector extension, scoped per agent. Retrieval uses cosine ANN re-ranked by importance and recency. Export and import as portable JSONL anytime.',
  },
  {
    q: 'Is it open source?',
    a: 'Yes — Apache-2.0. The monorepo ships the CLI, SDK, API and this site. Self-host with Docker (Postgres + Redis) or use HYRO Cloud.',
  },
];

export interface Phase {
  tag: string;
  done: boolean;
  title: string;
  desc: string;
}

export const ROADMAP: Phase[] = [
  { tag: 'P0', done: true, title: 'Foundation', desc: 'Monorepo, typed kernel, Fastify API, pgvector schema, HYRO CLI, landing page.' },
  { tag: 'P1', done: false, title: 'Runtime hardening', desc: 'Durable run queue, full SSE streaming, live provider completions, per-run caps.' },
  { tag: 'P2', done: false, title: 'MCP Hub GA', desc: 'Hosted signed registry, sandbox profiles, interactive permission grants.' },
  { tag: 'P3', done: false, title: 'Memory engine', desc: 'Hybrid retrieval, namespaces, summarization & compaction jobs.' },
  { tag: 'P4', done: false, title: 'Deploy & schedule', desc: 'Callable agent endpoints, webhooks, cron & event triggers, versioned rollouts.' },
  { tag: 'P5', done: false, title: 'Marketplace & teams', desc: 'Publishing pipeline, revenue share, orgs, SSO, audit logs, enterprise scale.' },
];

/** Live CLI simulation script. `cmd` lines are typed out; `out` lines appear instantly. */
export type CliLine =
  | { kind: 'cmd'; text: string }
  | { kind: 'out'; text: string; tone?: 'dim' | 'blue' | 'cyan' | 'green' | 'red' };

export const CLI_COMMANDS = [
  { cmd: 'hyro', desc: 'Open the HYRO dashboard (STATUS · COMMANDS · sources)' },
  { cmd: 'hyro login', desc: 'Authenticate with HYRO Cloud (api.hyrocloud.lol)' },
  { cmd: 'connect dexscreener', desc: 'Install + grant DexScreener MCP on VPS' },
  { cmd: 'connect base', desc: 'Base MCP — B20 balances + launch guide' },
  { cmd: 'hyro chat', desc: 'Interactive agent chat (same UI as dashboard)' },
  { cmd: 'hyro mcp list', desc: 'List installed MCP servers' },
  { cmd: 'hyro memory', desc: 'Goals, facts & policies (synced to VPS)' },
];

export const ARCHITECTURE_LAYERS = [
  {
    layer: 'Interface',
    items: ['Blue CLI & REPL', 'TypeScript SDK', 'REST + SSE API'],
    color: 'blue' as const,
  },
  {
    layer: 'Runtime',
    items: ['Run orchestrator', 'Tool sandbox', 'Step streaming', 'Offline local mode'],
    color: 'cyan' as const,
  },
  {
    layer: 'Connect',
    items: ['MCP Hub', 'Provider router', 'Webhook ingress', 'Agent marketplace'],
    color: 'green' as const,
  },
  {
    layer: 'Persist',
    items: ['PostgreSQL', 'pgvector recall', 'Redis queue', 'Run replay store'],
    color: 'blue' as const,
  },
];

export const MCP_STEPS = [
  { step: '01', title: 'Install', body: 'Pull signed MCP packages from the HYRO registry or point at a local server.' },
  { step: '02', title: 'Discover', body: 'Handshake exposes tools/resources; HYRO catalogs them per server with version pins.' },
  { step: '03', title: 'Grant', body: 'Deny-by-default. Grant tool-level permissions per agent before any call is proxied.' },
  { step: '04', title: 'Execute', body: 'Runtime proxies tools/call with timeouts, audit logs, and streamed step events.' },
];

export const LIVE_SCRIPT: CliLine[] = [
  { kind: 'out', text: '  Xiaomi MiMo · cloud ready    type chat to begin', tone: 'dim' },
  { kind: 'cmd', text: 'connect dexscreener' },
  { kind: 'out', text: '✔ dexscreener connected (MCP installed on VPS)', tone: 'green' },
  { kind: 'cmd', text: 'connect base' },
  { kind: 'out', text: '✔ base connected — B20 · x402 · Base Sepolia RPC', tone: 'green' },
  { kind: 'cmd', text: 'chat' },
  { kind: 'out', text: 'you › cek saldo B20 token 0xB200… di Sepolia', tone: 'dim' },
  { kind: 'out', text: 'hyro › get_token_balance → 1,000 MYT · b20_launch_guide ready', tone: 'cyan' },
];

/** Hero / launch dashboard typing loop (after static dashboard frame) */
export const DASHBOARD_LIVE_SCRIPT: CliLine[] = [
  { kind: 'cmd', text: 'connect github' },
  { kind: 'out', text: '✔ github connected (MCP installed on VPS)', tone: 'green' },
  { kind: 'cmd', text: 'add goal Launch B20 on Sepolia --deadline 2026-07-01' },
  { kind: 'out', text: '✔ Goal added — synced to VPS memory', tone: 'green' },
  { kind: 'cmd', text: 'chat' },
  { kind: 'out', text: 'you › pay 0.01 USDC via x402 for this API call', tone: 'dim' },
  { kind: 'out', text: 'hyro › x402 settled on Base · builderCode=hyro · Bankr-compatible', tone: 'cyan' },
];

export const MCP_TERMINAL_DEMO = [
  '# Install MCP on VPS (from your PC)',
  'hyro ❯ mcp install dexscreener',
  '✔ Installed DexScreener (2 tools)',
  'hyro ❯ mcp install base',
  '✔ Installed Base / B20 (5 tools)',
  'hyro ❯ mcp grant base',
  '✔ Granted * from Base / B20 to hyro',
  'hyro ❯ mcp tools base',
  '→ get_chain_info · get_balance · get_token_balance',
  '→ b20_launch_guide · send_transaction',
];

/* ===========================================================================
   HYRO × Base — x402 payments + Builder Codes (onchain attribution)
   Sources: docs.cdp.coinbase.com/x402 · blog.base.dev · @buildonbase
   =========================================================================== */

export const BASE_HERO = {
  badge: 'B20 · Base · x402 · Builder Codes',
  title: 'HYRO B20',
  subtitle:
    'B20 is our live Base integration — agents pay for tools, data and compute over HTTP with x402 (USDC on Base), with every onchain action tagged via Builder Codes (ERC-8021).',
};

export type BaseIcon =
  | 'Coins'
  | 'ShieldCheck'
  | 'Fuel'
  | 'Receipt'
  | 'BadgeCheck'
  | 'Network'
  | 'Boxes'
  | 'Trophy';

export interface BaseValue {
  idx: string;
  icon: BaseIcon;
  title: string;
  body: string;
}

export const BASE_VALUE: BaseValue[] = [
  {
    idx: '01',
    icon: 'Coins',
    title: 'USDC settlement',
    body: 'Agents pay in USDC, settled on Base — fast, final, sub-cent fees. No accounts or sessions required.',
  },
  {
    idx: '02',
    icon: 'ShieldCheck',
    title: 'Compliant by default',
    body: "Coinbase's x402 facilitator runs KYT/OFAC checks on every transaction and is fee-free for USDC on Base.",
  },
  {
    idx: '03',
    icon: 'Fuel',
    title: 'Gas abstracted',
    body: 'The facilitator handles gas, so autonomous agents transact without ever holding a native token.',
  },
  {
    idx: '04',
    icon: 'Receipt',
    title: 'Onchain attribution',
    body: 'Every agent action carries HYRO’s Builder Code via an ERC-8021 calldata suffix — a verifiable paper trail.',
  },
];

export interface X402Step {
  code: string;
  title: string;
  body: string;
}

export const X402_FLOW: X402Step[] = [
  {
    code: 'GET',
    title: 'Agent requests a resource',
    body: 'A HYRO agent calls a paid API, MCP tool, or dataset during a run step.',
  },
  {
    code: '402',
    title: 'Server replies “Payment Required”',
    body: 'The 402 response carries x402 payment details: amount, asset (USDC), recipient and network (base).',
  },
  {
    code: 'PAY',
    title: 'Agent pays in USDC',
    body: 'HYRO signs an x402 payment; the Coinbase facilitator verifies and settles it on Base.',
  },
  {
    code: '200',
    title: 'Resource unlocked',
    body: 'The agent retries with proof of payment and receives the resource — all inside one observable run.',
  },
];

export interface BuilderCodePoint {
  icon: BaseIcon;
  title: string;
  body: string;
}

export const BUILDER_CODES: BuilderCodePoint[] = [
  {
    icon: 'BadgeCheck',
    title: 'ERC-8021 attribution',
    body: 'A standardized data suffix is appended to transaction calldata — an onchain paper trail linking apps to the transactions they generate, without breaking the call.',
  },
  {
    icon: 'Boxes',
    title: 'Codes registry (ERC-721)',
    body: 'Base’s BuilderCodes contract lets you register a unique code (e.g. “hyro”) with a payout address, exposed via payoutAddress() for programmatic reward routing.',
  },
  {
    icon: 'Network',
    title: 'Composable credit',
    body: 'Comma-delimited codes mean a wallet, an aggregator and a frontend can all be credited in one transaction — ideal for multi-agent supply chains.',
  },
  {
    icon: 'Trophy',
    title: 'Rewards-ready',
    body: 'Builder Codes power Base.dev analytics and qualify apps for Base’s rewards program. (Smart Account txns today; EOA support coming.)',
  },
];

export const BUILDER_SNIPPET = `// Tag every HYRO agent transaction with our Base Builder Code (ERC-8021)
import { withBuilderCode } from "@hyro/base";

const tx = withBuilderCode(agentTx, {
  code:   "hyro",                 // registered on base.dev
  payout: "0xHYRO…Treasury",     // BuilderCodes.payoutAddress() (ERC-721)
});

// x402: pay for a tool / dataset in USDC, settled on Base
await hyro.x402.pay({
  network: "base",
  asset:   "USDC",
  to:      resource.recipient,
  amount:  resource.price,        // e.g. $0.01 / call
  builderCode: "hyro",            // attribution travels with the payment
});`;

export interface BaseUseCase {
  idx: string;
  title: string;
  body: string;
}

export const BASE_USECASES: BaseUseCase[] = [
  {
    idx: '01',
    title: 'Pay-per-call tools',
    body: 'Agents settle micro-payments for MCP tools, APIs and datasets the instant a server returns 402 — no API keys to provision.',
  },
  {
    idx: '02',
    title: 'Metered compute & memory',
    body: 'Run execution, embeddings and pgvector recall can be billed per use in USDC, with cost streamed into each run’s usage.',
  },
  {
    idx: '03',
    title: 'Marketplace revenue share',
    body: 'Published agents carry their creator’s Builder Code, so usage routes attribution and rewards to the author onchain.',
  },
  {
    idx: '04',
    title: 'Verifiable agent economy',
    body: 'Because every action is tagged, HYRO’s contribution to Base is measurable — and eligible for the Base rewards program.',
  },
];

export interface BaseSource {
  label: string;
  href: string;
  note: string;
}

export const BASE_SOURCES: BaseSource[] = [
  {
    label: 'x402 Builder Codes — Coinbase Developer Docs',
    href: SITE.x402Docs,
    note: 'Core concept: attaching builder codes to x402 payments.',
  },
  {
    label: 'Build on Base — announcement',
    href: SITE.baseAnnouncement,
    note: '@buildonbase on X.',
  },
  {
    label: 'Builder Codes & ERC-8021 — base.dev blog',
    href: SITE.baseDevBlog,
    note: 'Fixing onchain attribution.',
  },
  {
    label: 'Base Builder Codes — Base docs',
    href: SITE.baseBuilderDocs,
    note: 'Register a code & wire payouts.',
  },
];
