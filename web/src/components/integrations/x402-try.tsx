'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Download, Play, Receipt, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface X402Receipt {
  id: string;
  sandbox: boolean;
  network: string;
  asset: string;
  amount: string;
  payer: string;
  payTo: string;
  txHash: string;
  builderCode: string;
  resource: string;
  settledMs: number;
  timestamp: string;
}

interface Snapshot {
  tool: string;
  pair: string;
  price: number;
  gasGwei: number;
  block: number;
}

type Line = { t: string; tone?: 'req' | 'warn' | 'ok' | 'dim' };

const short = (s: string) => (s.length > 16 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function encode(r: X402Receipt): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(r))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
function decode(s: string): X402Receipt | null {
  try {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(b)))) as X402Receipt;
  } catch {
    return null;
  }
}

export function X402Try() {
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [receipt, setReceipt] = useState<X402Receipt | null>(null);
  const [result, setResult] = useState<Snapshot | null>(null);
  const [copied, setCopied] = useState<'json' | 'link' | null>(null);

  // Shareable: hydrate a receipt from the URL hash (#r=...).
  useEffect(() => {
    const m = window.location.hash.match(/r=([^&]+)/);
    if (m) {
      const r = decode(m[1]);
      if (r) setReceipt(r);
    }
  }, []);

  const push = (l: Line) => setLines((prev) => [...prev, l]);

  async function run() {
    setRunning(true);
    setLines([]);
    setReceipt(null);
    setResult(null);
    history.replaceState(null, '', window.location.pathname + window.location.search);

    push({ t: '$ agent → GET /api/x402', tone: 'req' });
    await wait(550);

    // 1) Unpaid request → 402.
    const challenge = await fetch('/api/x402', { cache: 'no-store' });
    const reqs = await challenge.json();
    const accept = reqs.accepts?.[0];
    push({ t: `← 402 Payment Required`, tone: 'warn' });
    await wait(350);
    push({
      t: `  needs ${accept?.extra?.priceUsd ?? '0.01'} USDC · ${accept?.network ?? 'base'} · → ${short(accept?.payTo ?? '')}`,
      tone: 'dim',
    });
    await wait(700);

    // 2) "Sign" the x402 payment (sandbox — no wallet, no funds).
    push({ t: '⊳ signing x402 payment (sandbox)…', tone: 'dim' });
    await wait(800);

    // 3) Retry with the payment header → 200 + receipt.
    push({ t: '$ agent → GET /api/x402  (X-PAYMENT)', tone: 'req' });
    await wait(450);
    const paid = await fetch('/api/x402', {
      cache: 'no-store',
      headers: { 'x-payment': 'sandbox.' + Date.now() },
    });
    const data = await paid.json();
    push({ t: `← 200 OK · settled in ${data.receipt.settledMs}ms`, tone: 'ok' });
    await wait(300);
    push({ t: `  builderCode=${data.receipt.builderCode} · tx ${short(data.receipt.txHash)}`, tone: 'dim' });

    setResult(data.result as Snapshot);
    setReceipt(data.receipt as X402Receipt);
    setRunning(false);
  }

  async function copyJson() {
    if (!receipt) return;
    await navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
    setCopied('json');
    setTimeout(() => setCopied(null), 1500);
  }
  async function copyLink() {
    if (!receipt) return;
    const url = `${window.location.origin}/x402#r=${encode(receipt)}`;
    await navigator.clipboard.writeText(url);
    setCopied('link');
    setTimeout(() => setCopied(null), 1500);
  }
  function download() {
    if (!receipt) return;
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${receipt.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const toneClass: Record<NonNullable<Line['tone']>, string> = {
    req: 'text-hyro-blue',
    warn: 'text-amber-500',
    ok: 'text-emerald-500',
    dim: 'text-hyro-dim',
  };

  return (
    <section className="mt-10 rounded-2xl border border-hyro-line/40 bg-hyro-panel/30 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-hyro-blue">
            <Receipt className="h-3.5 w-3.5" />
            Try a paid call
          </p>
          <h2 className="mt-1 font-mono text-lg font-semibold text-hyro-ink">
            Run the x402 handshake, get a receipt
          </h2>
        </div>
        <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 font-mono text-[10px] text-amber-600">
          sandbox · no funds move
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Live log */}
        <div className="flex flex-col">
          <div className="min-h-[180px] flex-1 rounded-xl border border-hyro-line/40 bg-[#070b12] p-4 font-mono text-[12px] leading-relaxed">
            {lines.length === 0 ? (
              <p className="text-hyro-mute">Press Run to send an unpaid request and watch it pay itself.</p>
            ) : (
              lines.map((l, i) => (
                <div key={i} className={toneClass[l.tone ?? 'dim']}>
                  {l.t}
                </div>
              ))
            )}
          </div>
          <div className="mt-3">
            <Button size="sm" onClick={run} disabled={running}>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              {running ? 'Running…' : 'Run paid call'}
            </Button>
          </div>
        </div>

        {/* Receipt card */}
        <div className="rounded-xl border border-hyro-line/40 bg-hyro-bg/40 p-4">
          {!receipt ? (
            <p className="font-mono text-[12px] text-hyro-mute">
              The signed receipt appears here — shareable, downloadable, with the onchain Builder Code.
            </p>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-emerald-500">
                  <Check className="h-3.5 w-3.5" /> settled
                </p>
                <p className="font-mono text-[10px] text-hyro-mute">{receipt.id}</p>
              </div>
              <dl className="space-y-1.5 font-mono text-[11px]">
                {[
                  ['amount', `${receipt.amount} ${receipt.asset}`],
                  ['network', receipt.network],
                  ['payer', short(receipt.payer)],
                  ['payTo', short(receipt.payTo)],
                  ['tx', short(receipt.txHash)],
                  ['builderCode', receipt.builderCode],
                  ['settled', `${receipt.settledMs}ms`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-hyro-mute">{k}</dt>
                    <dd className="text-hyro-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              {result && (
                <p className="mt-3 border-t border-hyro-line/30 pt-3 font-mono text-[11px] text-hyro-dim">
                  bought: {result.pair} ${result.price} · gas {result.gasGwei} gwei · block {result.block}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={copyLink}>
                  <Share2 className="mr-1.5 h-3.5 w-3.5" />
                  {copied === 'link' ? 'Copied' : 'Share link'}
                </Button>
                <Button size="sm" variant="outline" onClick={copyJson}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {copied === 'json' ? 'Copied' : 'Copy JSON'}
                </Button>
                <Button size="sm" variant="outline" onClick={download}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
