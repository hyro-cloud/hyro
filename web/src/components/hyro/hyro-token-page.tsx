'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  HYRO_TOKEN,
  fetchHyroMarket,
  formatPct,
  formatUsdCompact,
  parseMicroPrice,
  subscriptCount,
  type HyroMarketPair,
} from '@/lib/hyro-token';
import { cn } from '@/lib/utils';

function ChangeValue({ value, suffix = '' }: { value: number | null; suffix?: string }) {
  if (value == null) return <span className="text-hyro-dim">—</span>;
  const up = value >= 0;
  return (
    <span className={cn('inline-flex items-center gap-1 font-mono', up ? 'text-hyro-green' : 'text-hyro-red')}>
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {formatPct(value)}
      {suffix}
    </span>
  );
}

function PriceDisplay({ value }: { value: number | null }) {
  const parts = parseMicroPrice(value);
  if (parts.zeroCount == null) {
    return <span className="text-xl sm:text-2xl">{parts.head}{parts.tail}</span>;
  }
  return (
    <span className="font-mono text-xl sm:text-2xl tracking-tight">
      {parts.head}
      <span className="text-hyro-blue">{subscriptCount(parts.zeroCount)}</span>
      {parts.tail}
    </span>
  );
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function StatCard({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-hyro-line/60 bg-hyro-panel/40 px-4 py-3 backdrop-blur-sm',
        className,
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-hyro-faint">{label}</p>
      <div className="mt-1.5 font-mono text-[15px] font-medium text-hyro-ink">{children}</div>
    </div>
  );
}

export function HyroTokenPage() {
  const [market, setMarket] = useState<HyroMarketPair | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchHyroMarket();
      setMarket(data);
      setUpdatedAt(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(true), 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const copyCa = async () => {
    try {
      await navigator.clipboard.writeText(HYRO_TOKEN.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const pairMeta = market
    ? `${market.baseSymbol}/${market.quoteSymbol} · ${market.dexId} · ${market.pairAgeDays != null ? `${market.pairAgeDays} days old` : '—'} · ${market.pairCount} pair${market.pairCount === 1 ? '' : 's'}`
    : null;

  return (
    <div className="min-h-screen bg-hyro-bg pt-24 pb-20">
      <div className="shell mx-auto max-w-5xl px-4 sm:px-6">
        {/* Hero */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-hyro-blue/40 bg-hyro-blue/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-hyro-blue">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-hyro-green" aria-hidden />
            Live · Base Network
          </span>
          <h1 className="mt-6 font-mono text-3xl font-semibold tracking-tight text-hyro-ink sm:text-4xl md:text-5xl">
            The <span className="text-hyro-blue term-glow">$HYRO</span> Token
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-hyro-dim sm:text-base">
            Community token for HYRO Cloud — the operating system for autonomous agents on Base.
          </p>
        </div>

        {/* Contract address */}
        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center gap-3 rounded-xl border border-hyro-line/60 bg-hyro-panel/50 px-4 py-3 sm:px-5">
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-hyro-faint">CA</span>
          <code className="min-w-0 flex-1 break-all font-mono text-[12px] text-hyro-mute sm:text-[13px]">
            {HYRO_TOKEN.address}
          </code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5 font-mono text-[11px]"
            onClick={() => void copyCa()}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        {/* Live market data */}
        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-hyro-faint">
              Live market data
            </h2>
            <div className="flex items-center gap-2">
              {updatedAt && (
                <span className="font-mono text-[10px] text-hyro-dim">
                  Updated {updatedAt.toLocaleTimeString()}
                </span>
              )}
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-md border border-hyro-line/60 px-2 py-1 font-mono text-[10px] text-hyro-dim transition hover:border-hyro-blue/40 hover:text-hyro-blue disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <p className="mb-4 rounded-lg border border-hyro-red/30 bg-hyro-red/10 px-4 py-2 font-mono text-[12px] text-hyro-red">
              {error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Price" className="sm:col-span-2 lg:col-span-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <PriceDisplay value={market?.priceUsd ?? null} />
                {market?.changeH24 != null && (
                  <ChangeValue value={market.changeH24} suffix=" (24h)" />
                )}
              </div>
            </StatCard>
            <StatCard label="1H change">
              <ChangeValue value={market?.changeH1 ?? null} />
            </StatCard>
            <StatCard label="Liquidity">{formatUsdCompact(market?.liquidityUsd ?? null)}</StatCard>
            <StatCard label="Volume 24H">{formatUsdCompact(market?.volumeH24 ?? null)}</StatCard>
            <StatCard label="Volume 1H">{formatUsdCompact(market?.volumeH1 ?? null)}</StatCard>
            <StatCard label="Market cap">{formatUsdCompact(market?.marketCap ?? null)}</StatCard>
            <StatCard label="FDV">{formatUsdCompact(market?.fdv ?? null)}</StatCard>
          </div>

          {pairMeta && (
            <p className="mt-3 font-mono text-[10px] text-hyro-dim">{pairMeta}</p>
          )}
        </section>

        {/* DexScreener embed */}
        <section className="mt-10">
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-hyro-faint">
            Chart
          </h2>
          <div className="overflow-hidden rounded-xl border border-hyro-line/60 bg-hyro-panel/30">
            <div className="relative aspect-[16/10] w-full min-h-[320px] sm:min-h-[420px]">
              <iframe
                title="HYRO on DexScreener"
                src={HYRO_TOKEN.embedUrl}
                className="absolute inset-0 h-full w-full border-0"
                allow="clipboard-write"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* Get $HYRO */}
        <section className="mt-12">
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-hyro-faint">
            Get $HYRO
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <GetCard
              title="DexScreener"
              subtitle="View chart & buy"
              href={market?.url ?? HYRO_TOKEN.dexscreenerUrl}
              accent="text-hyro-blue"
            />
            <GetCard
              title="Uniswap"
              subtitle="Swap on Base"
              href={HYRO_TOKEN.uniswapUrl}
              accent="text-pink-400"
            />
            <GetCard
              title="Bankr"
              subtitle="Launch & agent tools"
              href={HYRO_TOKEN.bankrUrl}
              accent="text-hyro-green"
            />
          </div>
        </section>

        {/* Footer note */}
        <p className="mt-10 text-center font-mono text-[10px] leading-relaxed text-hyro-faint">
          Contract{' '}
          <a
            href={`https://basescan.org/address/${HYRO_TOKEN.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-hyro-blue hover:underline"
          >
            {shortAddr(HYRO_TOKEN.address)}
          </a>
          {' · '}
          Data from{' '}
          <a
            href={HYRO_TOKEN.dexscreenerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-hyro-blue hover:underline"
          >
            DexScreener
          </a>
          . Not financial advice.
        </p>
      </div>
    </div>
  );
}

function GetCard({
  title,
  subtitle,
  href,
  accent,
}: {
  title: string;
  subtitle: string;
  href: string;
  accent: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between rounded-xl border border-hyro-line/60 bg-hyro-panel/40 px-5 py-4 transition hover:border-hyro-blue/40 hover:bg-hyro-panel/70"
    >
      <div>
        <p className={cn('font-mono text-[14px] font-semibold text-hyro-ink', accent)}>{title}</p>
        <p className="mt-0.5 text-[12px] text-hyro-dim">{subtitle}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-hyro-dim transition group-hover:text-hyro-blue" />
    </a>
  );
}
