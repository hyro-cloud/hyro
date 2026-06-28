/** $HYRO community token on Base — single source for links & market fetch. */

export const HYRO_TOKEN = {
  address: '0x8ac064f55d7be35cdc8380f74a109f5ae4959ba3' as const,
  chain: 'base' as const,
  symbol: 'HYRO',
  name: 'HYRO',
  bankrUrl: 'https://bankr.bot/launches/0x8ac064f55d7be35cdc8380f74a109f5ae4959ba3',
  dexscreenerUrl: 'https://dexscreener.com/base/0x8ac064f55d7be35cdc8380f74a109f5ae4959ba3',
  uniswapUrl:
    'https://app.uniswap.org/swap?chain=base&outputCurrency=0x8ac064f55d7be35cdc8380f74a109f5ae4959ba3',
  embedUrl:
    'https://dexscreener.com/base/0x8ac064f55d7be35cdc8380f74a109f5ae4959ba3?embed=1&loadChartSettings=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=0&chartType=usd&interval=15',
  apiUrl: 'https://api.dexscreener.com/latest/dex/tokens/0x8ac064f55d7be35cdc8380f74a109f5ae4959ba3',
} as const;

export interface HyroMarketPair {
  pairAddress: string;
  dexId: string;
  url: string;
  baseSymbol: string;
  quoteSymbol: string;
  priceUsd: number | null;
  liquidityUsd: number | null;
  volumeH24: number | null;
  volumeH1: number | null;
  marketCap: number | null;
  fdv: number | null;
  changeH1: number | null;
  changeH4: number | null;
  changeH24: number | null;
  pairCount: number;
  pairAgeDays: number | null;
}

interface DexPair {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { symbol?: string };
  quoteToken?: { symbol?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number; h1?: number };
  marketCap?: number;
  fdv?: number;
  priceChange?: { h1?: number; h4?: number; h24?: number };
  pairCreatedAt?: number;
}

function num(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function pickBestBasePair(pairs: DexPair[]): DexPair | null {
  const onBase = pairs.filter((p) => p.chainId === 'base');
  if (!onBase.length) return null;
  return onBase.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] ?? null;
}

export function parseHyroMarketData(data: { pairs?: DexPair[] }): HyroMarketPair | null {
  const pairs = data.pairs ?? [];
  const best = pickBestBasePair(pairs);
  if (!best) return null;

  const created = best.pairCreatedAt;
  const pairAgeDays =
    created != null ? Math.max(0, Math.floor((Date.now() - created) / 86_400_000)) : null;

  return {
    pairAddress: best.pairAddress ?? '',
    dexId: best.dexId ?? 'unknown',
    url: best.url ?? HYRO_TOKEN.dexscreenerUrl,
    baseSymbol: best.baseToken?.symbol ?? HYRO_TOKEN.symbol,
    quoteSymbol: best.quoteToken?.symbol ?? 'WETH',
    priceUsd: num(best.priceUsd),
    liquidityUsd: num(best.liquidity?.usd),
    volumeH24: num(best.volume?.h24),
    volumeH1: num(best.volume?.h1),
    marketCap: num(best.marketCap),
    fdv: num(best.fdv),
    changeH1: num(best.priceChange?.h1),
    changeH4: num(best.priceChange?.h4),
    changeH24: num(best.priceChange?.h24),
    pairCount: pairs.filter((p) => p.chainId === 'base').length,
    pairAgeDays,
  };
}

/** Server-side DexScreener fetch (API route / SSR). */
export async function fetchHyroMarketFromDexscreener(): Promise<HyroMarketPair | null> {
  const res = await fetch(HYRO_TOKEN.apiUrl, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`DexScreener ${res.status}`);
  const data = (await res.json()) as { pairs?: DexPair[] };
  return parseHyroMarketData(data);
}

/** Client-side — proxies via /api/hyro/market to avoid browser CORS blocks. */
export async function fetchHyroMarket(): Promise<HyroMarketPair | null> {
  const res = await fetch('/api/hyro/market', { cache: 'no-store' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Market API ${res.status}`);
  }
  const body = (await res.json()) as { market: HyroMarketPair | null };
  return body.market;
}

export function formatUsdCompact(value: number | null): string {
  if (value == null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}

/** Parsed micro-cap price: $0.0 + subscript zero count + significant digits. */
export interface MicroPriceParts {
  head: string;
  zeroCount: number | null;
  tail: string;
}

const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'] as const;

export function subscriptCount(n: number): string {
  return String(n)
    .split('')
    .map((d) => SUBSCRIPT_DIGITS[Number(d)] ?? d)
    .join('');
}

/** e.g. 0.0000003092 → { head: '$0.0', zeroCount: 6, tail: '3092' } */
export function parseMicroPrice(value: number | null): MicroPriceParts {
  if (value == null) return { head: '—', zeroCount: null, tail: '' };
  if (value >= 1) {
    return {
      head: `$${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
      zeroCount: null,
      tail: '',
    };
  }
  if (value >= 0.01) {
    return { head: `$${value.toFixed(4)}`, zeroCount: null, tail: '' };
  }

  const str = value.toFixed(24).replace(/0+$/, '');
  const match = str.match(/^0\.(0*)([1-9]\d*)/);
  if (match && match[1].length >= 2) {
    const sig = match[2].replace(/0+$/, '').slice(0, 4);
    return { head: '$0.0', zeroCount: match[1].length, tail: sig };
  }

  return { head: `$${value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')}`, zeroCount: null, tail: '' };
}

export function formatMicroPrice(value: number | null): string {
  const p = parseMicroPrice(value);
  if (p.zeroCount == null) return `${p.head}${p.tail}`;
  return `${p.head}${subscriptCount(p.zeroCount)}${p.tail}`;
}

/** @deprecated Use parseMicroPrice / formatMicroPrice */
export function formatPrice(value: number | null): string {
  return formatMicroPrice(value);
}

export function formatPct(value: number | null): string {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
