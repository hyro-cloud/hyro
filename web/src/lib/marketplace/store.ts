import { promises as fs } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import type { BuyResponse, Listing, MemoryItem, PublishInput, Receipt } from './types';

/** Real settlement is available only when a signing wallet is configured. */
function walletConfigured(): boolean {
  return !!process.env.WALLET_PRIVATE_KEY?.trim();
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'marketplace.json');

/** Sample skill outputs / memory packs keyed by slug (what a buyer receives). */
const PAYLOADS: Record<string, { result?: unknown; memory?: MemoryItem[] }> = {
  'wallet-risk-score': {
    result: { tool: 'wallet.risk', address: '0x1f9…c3a2', score: 82, tier: 'high', flags: ['fresh-wallet', 'mixer-adjacent'] },
  },
  'base-gas-oracle': {
    result: { tool: 'base.gas', network: 'base', gasGwei: 0.0061, blockTime: 2.0, updatedAt: 'live' },
  },
  'token-sniff': {
    result: { tool: 'token.sniff', pair: 'ETH/USDC', liquidityUsd: 1840000, honeypot: false, buyTax: 0, sellTax: 0 },
  },
  'usdc-balance': {
    result: { tool: 'wallet.balance', address: '0x1f9…c3a2', usdc: '1240.55', eth: '0.834', tokens: 3 },
  },
  'dex-quote': {
    result: { tool: 'dex.quote', pair: 'ETH/USDC', amountIn: '1', amountOut: '2431.02', route: 'uniswap-v3', priceImpact: '0.12%' },
  },
  'token-metadata': {
    result: { tool: 'token.meta', address: '0x833…2913', name: 'USD Coin', symbol: 'USDC', decimals: 6, totalSupply: '5.1B' },
  },
  'contract-abi': {
    result: { tool: 'contract.abi', address: '0x833…2913', verified: true, functions: ['balanceOf', 'transfer', 'approve', 'allowance'], events: ['Transfer', 'Approval'] },
  },
  'tx-decoder': {
    result: { tool: 'tx.decode', hash: '0x8495…9381', method: 'transfer(address,uint256)', args: { to: '0xab…f0', amount: '25.00 USDC' }, status: 'success' },
  },
  'basename-resolver': {
    result: { tool: 'basename', query: 'hyro.base.eth', address: '0x6862…0001', reverse: 'hyro.base.eth' },
  },
  'wallet-pnl': {
    result: { tool: 'wallet.pnl', address: '0x1f9…c3a2', realizedUsd: '+842.10', unrealizedUsd: '+120.00', winRate: '63%', trades: 148 },
  },
  'base-alpha-memory': {
    memory: [
      { type: 'fact', content: 'Base USDC contract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (6 decimals).' },
      { type: 'fact', content: 'x402 settlement on Base typically confirms in under 2 seconds.' },
      { type: 'policy', content: 'Tag every onchain action with builderCode=hyro (ERC-8021).' },
      { type: 'policy', content: 'Never send a transaction above 50 USDC without explicit confirmation.' },
    ],
  },
  'defi-safety-policies': {
    memory: [
      { type: 'policy', content: 'Reject any token with sell tax above 10 percent.' },
      { type: 'policy', content: 'Require liquidity above 100k USD before quoting a swap.' },
      { type: 'policy', content: 'Always simulate a transaction before broadcasting it.' },
    ],
  },
};

// Set HYRO_X402_WALLET to your Bankr wallet so the official skill URLs point at
// your live deployments (https://x402.bankr.bot/<wallet>/<slug>).
const HYRO_WALLET = process.env.HYRO_X402_WALLET?.trim() || '0x6862E3aB6cE2C5b2F0bE3a4F2ED3C1b0AD9F0001';

export const SEED_LISTINGS: Listing[] = [
  {
    slug: 'wallet-risk-score', kind: 'skill', title: 'Wallet Risk Score',
    summary: 'Score any Base address for risk in real time. Flags fresh wallets, mixer proximity, and drain patterns.',
    category: 'onchain', tags: ['base', 'risk', 'security'], price: '0.01', currency: 'USDC', network: 'base',
    x402Url: `https://x402.bankr.bot/${HYRO_WALLET}/wallet-risk-score`, seller: '@HyroCloud', builderCode: 'hyro',
    live: false, installs: 214, createdAt: '2026-06-20T00:00:00.000Z',
  },
  {
    slug: 'base-gas-oracle', kind: 'skill', title: 'Base Gas Oracle',
    summary: 'Live Base gas and block-time snapshot for agents that time their transactions.',
    category: 'onchain', tags: ['base', 'gas', 'oracle'], price: '0.002', currency: 'USDC', network: 'base',
    x402Url: `https://x402.bankr.bot/${HYRO_WALLET}/base-gas-oracle`, seller: '@HyroCloud', builderCode: 'hyro',
    live: false, installs: 431, createdAt: '2026-06-18T00:00:00.000Z',
  },
  {
    slug: 'token-sniff', kind: 'skill', title: 'Token Sniff',
    summary: 'Honeypot, tax, and liquidity check for any Base token before an agent buys.',
    category: 'data', tags: ['token', 'safety', 'dexscreener'], price: '0.005', currency: 'USDC', network: 'base',
    x402Url: `https://x402.bankr.bot/${HYRO_WALLET}/token-sniff`, seller: '@HyroCloud', builderCode: 'hyro',
    live: false, installs: 168, createdAt: '2026-06-16T00:00:00.000Z',
  },
  {
    slug: 'usdc-balance', kind: 'skill', title: 'USDC & Token Balance',
    summary: 'Full balance snapshot for any Base address: native ETH, USDC, and ERC-20 holdings in one call.',
    category: 'onchain', tags: ['base', 'balance', 'usdc'], price: '0.001', currency: 'USDC', network: 'base',
    x402Url: `https://x402.bankr.bot/${HYRO_WALLET}/usdc-balance`, seller: '@HyroCloud', builderCode: 'hyro',
    live: false, installs: 356, createdAt: '2026-06-24T00:00:00.000Z',
  },
  {
    slug: 'dex-quote', kind: 'skill', title: 'DEX Quote',
    summary: 'Best swap quote for any Base pair, with route and price impact, so agents trade with open eyes.',
    category: 'data', tags: ['base', 'swap', 'dex'], price: '0.006', currency: 'USDC', network: 'base',
    x402Url: `https://x402.bankr.bot/${HYRO_WALLET}/dex-quote`, seller: '@HyroCloud', builderCode: 'hyro',
    live: false, installs: 203, createdAt: '2026-06-25T00:00:00.000Z',
  },
  {
    slug: 'token-metadata', kind: 'skill', title: 'Token Metadata',
    summary: 'Name, symbol, decimals, and supply for any Base token address. The cheapest read in the catalog.',
    category: 'data', tags: ['base', 'token', 'metadata'], price: '0.001', currency: 'USDC', network: 'base',
    x402Url: `https://x402.bankr.bot/${HYRO_WALLET}/token-metadata`, seller: '@HyroCloud', builderCode: 'hyro',
    live: false, installs: 289, createdAt: '2026-06-23T00:00:00.000Z',
  },
  {
    slug: 'contract-abi', kind: 'skill', title: 'Contract ABI',
    summary: 'Fetch the verified ABI for a Base contract, with a clean list of callable functions and events.',
    category: 'onchain', tags: ['base', 'abi', 'contract'], price: '0.003', currency: 'USDC', network: 'base',
    x402Url: `https://x402.bankr.bot/${HYRO_WALLET}/contract-abi`, seller: '@HyroCloud', builderCode: 'hyro',
    live: false, installs: 141, createdAt: '2026-06-21T00:00:00.000Z',
  },
  {
    slug: 'tx-decoder', kind: 'skill', title: 'Transaction Decoder',
    summary: 'Turn a Base transaction hash into a human-readable action: method, arguments, and status.',
    category: 'onchain', tags: ['base', 'tx', 'decode'], price: '0.004', currency: 'USDC', network: 'base',
    x402Url: `https://x402.bankr.bot/${HYRO_WALLET}/tx-decoder`, seller: '@HyroCloud', builderCode: 'hyro',
    live: false, installs: 122, createdAt: '2026-06-19T00:00:00.000Z',
  },
  {
    slug: 'basename-resolver', kind: 'skill', title: 'Basename Resolver',
    summary: 'Resolve a Basename or ENS name to an address and back. Forward and reverse in a single call.',
    category: 'onchain', tags: ['base', 'basename', 'ens'], price: '0.002', currency: 'USDC', network: 'base',
    x402Url: `https://x402.bankr.bot/${HYRO_WALLET}/basename-resolver`, seller: '@HyroCloud', builderCode: 'hyro',
    live: false, installs: 176, createdAt: '2026-06-17T00:00:00.000Z',
  },
  {
    slug: 'wallet-pnl', kind: 'skill', title: 'Wallet PnL',
    summary: 'Realized and unrealized PnL, win rate, and trade count for any Base wallet. Alpha in one request.',
    category: 'onchain', tags: ['base', 'pnl', 'analytics'], price: '0.008', currency: 'USDC', network: 'base',
    x402Url: `https://x402.bankr.bot/${HYRO_WALLET}/wallet-pnl`, seller: '@HyroCloud', builderCode: 'hyro',
    live: false, installs: 98, createdAt: '2026-06-26T00:00:00.000Z',
  },
  {
    slug: 'base-alpha-memory', kind: 'memory', title: 'Base Alpha Memory Pack',
    summary: 'Curated facts and policies for agents operating on Base. Import straight into HYRO memory.',
    category: 'memory', tags: ['base', 'facts', 'policies'], price: '0.05', currency: 'USDC', network: 'base',
    x402Url: `https://x402.bankr.bot/${HYRO_WALLET}/base-alpha-memory`, seller: '@HyroCloud', builderCode: 'hyro',
    live: false, installs: 92, createdAt: '2026-06-22T00:00:00.000Z',
  },
  {
    slug: 'defi-safety-policies', kind: 'memory', title: 'DeFi Safety Policies',
    summary: 'A policy pack that keeps trading agents from getting rugged. Drop-in guardrails.',
    category: 'memory', tags: ['defi', 'policies', 'safety'], price: '0.03', currency: 'USDC', network: 'base',
    x402Url: `https://x402.bankr.bot/${HYRO_WALLET}/defi-safety`, seller: '@HyroCloud', builderCode: 'hyro',
    live: false, installs: 57, createdAt: '2026-06-14T00:00:00.000Z',
  },
];

export function slugify(s: string): string {
  return (
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'listing'
  );
}

async function readUser(): Promise<Listing[]> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')) as Listing[];
  } catch {
    return [];
  }
}

async function writeUser(list: Listing[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2));
}

export async function allListings(): Promise<Listing[]> {
  const bySlug = new Map<string, Listing>();
  for (const l of SEED_LISTINGS) bySlug.set(l.slug, l);
  for (const l of await readUser()) bySlug.set(l.slug, l); // user overrides seed
  return [...bySlug.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function filterListings(opts: { q?: string; kind?: string; category?: string }): Promise<Listing[]> {
  const q = opts.q?.trim().toLowerCase();
  return (await allListings()).filter((l) => {
    if (opts.kind && opts.kind !== 'all' && l.kind !== opts.kind) return false;
    if (opts.category && l.category !== opts.category) return false;
    if (q && !(`${l.title} ${l.summary} ${l.tags.join(' ')}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

export async function getListing(slug: string): Promise<Listing | null> {
  return (await allListings()).find((l) => l.slug === slug) ?? null;
}

/** Register a Bankr x402 URL as a listing. Reads the live 402 challenge to confirm price/network. */
export async function publishListing(input: PublishInput): Promise<Listing> {
  if (!input.title?.trim()) throw new Error('title required');
  if (!/^https?:\/\/.+/i.test(input.x402Url || '')) throw new Error('a valid x402Url is required');

  let price = String(input.price ?? '').trim();
  let network = 'base';
  let live = false;
  // Best-effort: hit the endpoint unpaid and read x402 payment requirements.
  try {
    const res = await fetch(input.x402Url, { method: 'GET', cache: 'no-store' });
    if (res.status === 402) {
      const body = (await res.json()) as { accepts?: Array<{ maxAmountRequired?: string; network?: string; extra?: { priceUsd?: string } }> };
      const a = body.accepts?.[0];
      if (a?.extra?.priceUsd) price = a.extra.priceUsd;
      else if (a?.maxAmountRequired) price = (Number(a.maxAmountRequired) / 1e6).toString();
      if (a?.network) network = a.network;
      live = true; // real endpoint responded with a proper challenge
    }
  } catch {
    // endpoint unreachable at publish time; list it anyway as not-yet-live
  }
  if (!price || Number.isNaN(Number(price))) throw new Error('price required (endpoint did not advertise one)');

  const existing = await allListings();
  let slug = slugify(input.title);
  let n = 1;
  while (existing.some((l) => l.slug === slug)) slug = `${slugify(input.title)}-${++n}`;

  const listing: Listing = {
    slug,
    kind: input.kind === 'memory' ? 'memory' : 'skill',
    title: input.title.trim(),
    summary: input.summary?.trim() || `${input.kind === 'memory' ? 'Memory pack' : 'Skill'} on Bankr x402 Cloud.`,
    category: input.category?.trim() || (input.kind === 'memory' ? 'memory' : 'skill'),
    tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 6),
    price,
    currency: 'USDC',
    network: network as Listing['network'],
    x402Url: input.x402Url.trim(),
    seller: input.seller?.trim() || 'community',
    builderCode: 'hyro',
    live,
    installs: 0,
    createdAt: new Date().toISOString(),
  };
  const user = await readUser();
  user.unshift(listing);
  await writeUser(user);
  return listing;
}

function hex(bytes: number): string {
  return '0x' + randomBytes(bytes).toString('hex');
}

function sandboxReceipt(listing: Listing): Receipt {
  return {
    id: 'rcpt_' + randomUUID().replace(/-/g, '').slice(0, 18),
    status: 'settled',
    sandbox: true,
    network: listing.network,
    asset: listing.currency,
    amount: listing.price,
    payer: hex(20),
    payTo: listing.x402Url.match(/0x[0-9a-fA-F]{40}/)?.[0] ?? HYRO_WALLET,
    txHash: hex(32),
    builderCode: listing.builderCode,
    resource: listing.x402Url,
    settledMs: 500 + Math.floor(Math.random() * 800),
    timestamp: new Date().toISOString(),
  };
}

/** Coerce a memory endpoint's response into importable HYRO memory records. */
function toMemItems(result: unknown, fallbackTitle: string): MemoryItem[] {
  const r = result as { items?: unknown; memory?: unknown };
  const raw = Array.isArray(result) ? result : Array.isArray(r?.items) ? r.items : Array.isArray(r?.memory) ? r.memory : [];
  const items = (raw as unknown[])
    .map((x) => x as { type?: unknown; content?: unknown })
    .filter((x) => typeof x.content === 'string')
    .map((x) => ({ type: String(x.type ?? 'fact'), content: String(x.content) }));
  return items.length ? items : [{ type: 'fact', content: `Purchased memory pack: ${fallbackTitle}` }];
}

/**
 * Run the x402 buy. Real USDC settlement when the listing is live AND a server
 * wallet is configured (WALLET_PRIVATE_KEY); otherwise a sandbox demo.
 */
export async function buyListing(slug: string): Promise<BuyResponse> {
  const listing = await getListing(slug);
  if (!listing) throw new Error('listing not found');

  let receipt: Receipt;
  let result: unknown;

  if (listing.live && walletConfigured()) {
    // Lazy-load the payment module so viem/x402-fetch are only pulled in when a real
    // payment actually happens (keeps list + sandbox buys dependency-free).
    const { payAndFetch } = await import('./x402-pay');
    const real = await payAndFetch(listing); // pays real USDC on Base; throws on failure
    receipt = real.receipt;
    result = real.result;
  } else {
    receipt = sandboxReceipt(listing);
    const payload = PAYLOADS[slug];
    result =
      listing.kind === 'memory'
        ? { items: payload?.memory ?? [] }
        : payload?.result ?? { tool: slug, ok: true, note: 'sandbox result — wire a live Bankr endpoint for real data' };
  }

  if (listing.kind === 'memory') {
    const items = toMemItems(result, listing.title);
    const jsonl = items.map((i) => JSON.stringify(i)).join('\n');
    return {
      ok: true, slug, kind: 'memory', receipt,
      memory: { items, jsonl, importCmd: `hyro memory import ${slug}.jsonl` },
    };
  }
  return { ok: true, slug, kind: 'skill', receipt, result };
}
