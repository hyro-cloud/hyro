'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, Download, Play, Plus, Search, Sparkles, Store, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BuyResponse, Listing, ListingKind, PublishInput } from '@/lib/marketplace/types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const short = (s: string) => (s.length > 18 ? `${s.slice(0, 10)}…${s.slice(-6)}` : s);
const price = (l: Listing) => `$${l.price} ${l.currency}`;

const KINDS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'skill', label: 'Skills' },
  { key: 'memory', label: 'Memory' },
];

function kindBadge(kind: ListingKind) {
  return kind === 'memory'
    ? 'border-violet-300 bg-violet-500/10 text-violet-600'
    : 'border-hyro-line bg-hyro-blue/5 text-hyro-blue';
}

export function MarketplaceApp() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [selected, setSelected] = useState<Listing | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (kind !== 'all') params.set('kind', kind);
    const res = await fetch(`/api/marketplace?${params.toString()}`, { cache: 'no-store' });
    const data = (await res.json()) as { listings: Listing[] };
    setListings(data.listings);
    setLoading(false);
  }, [q, kind]);

  useEffect(() => {
    const t = setTimeout(load, 180);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="min-h-screen bg-hyro-bg pt-20 pb-16">
      <div className="shell px-4 sm:px-6">
        <header className="mb-8 border-b border-hyro-line/50 pb-8">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-hyro-blue">
            <Store className="h-3.5 w-3.5" /> Marketplace · x402 · Base
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-mono text-3xl font-semibold text-hyro-ink sm:text-4xl">Skills &amp; Memory</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hyro-dim">
                Paid agent skills and memory packs, settled in USDC on Base via Bankr x402 Cloud. Agents pay per call,
                every purchase is tagged with a Builder Code.
              </p>
            </div>
            <Button onClick={() => setPublishOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> List your skill
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hyro-mute" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skills and memory packs"
              className="w-full rounded-lg border border-hyro-line/40 bg-hyro-panel/30 py-2.5 pl-9 pr-3 font-mono text-sm text-hyro-ink outline-none placeholder:text-hyro-mute focus:border-hyro-blue/50"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-hyro-line/40 bg-hyro-panel/30 p-1">
            {KINDS.map((k) => (
              <button
                key={k.key}
                onClick={() => setKind(k.key)}
                className={`rounded-md px-3 py-1.5 font-mono text-xs transition ${
                  kind === k.key ? 'bg-hyro-blue text-white' : 'text-hyro-dim hover:text-hyro-ink'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <p className="py-16 text-center font-mono text-sm text-hyro-mute">Loading marketplace…</p>
        ) : listings.length === 0 ? (
          <p className="py-16 text-center font-mono text-sm text-hyro-mute">No listings match your search.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <button
                key={l.slug}
                onClick={() => setSelected(l)}
                className="group flex flex-col rounded-xl border border-hyro-line/30 bg-hyro-panel/30 p-5 text-left transition hover:-translate-y-1 hover:border-hyro-blue/40 hover:shadow-[0_18px_48px_-20px_rgba(59,140,255,0.4)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${kindBadge(l.kind)}`}>
                    {l.kind}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-hyro-mute">
                    {l.live ? 'live' : 'sandbox'}
                  </span>
                </div>
                <h3 className="font-mono text-[15px] font-semibold text-hyro-ink">{l.title}</h3>
                <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-hyro-dim">{l.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.tags.slice(0, 3).map((t) => (
                    <span key={t} className="rounded bg-hyro-blue/5 px-2 py-0.5 font-mono text-[10px] text-hyro-blue">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-hyro-line/20 pt-3">
                  <span className="font-mono text-sm font-semibold text-hyro-ink">{price(l)}</span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-hyro-blue">
                    Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="mt-10 text-center font-mono text-[12px] text-hyro-mute">
          Sell your own:{' '}
          <a href="https://docs.bankr.bot/x402-cloud/quick-start" target="_blank" rel="noopener noreferrer" className="text-hyro-blue hover:underline">
            deploy on Bankr x402 Cloud
          </a>{' '}
          then <Link href="#" onClick={(e) => { e.preventDefault(); setPublishOpen(true); }} className="text-hyro-blue hover:underline">list it here</Link>.
        </p>
      </div>

      {selected && <DetailModal listing={selected} onClose={() => setSelected(null)} />}
      {publishOpen && <PublishModal onClose={() => setPublishOpen(false)} onPublished={() => { setPublishOpen(false); void load(); }} />}
    </div>
  );
}

function DetailModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const [lines, setLines] = useState<{ t: string; tone: string }[]>([]);
  const [buying, setBuying] = useState(false);
  const [out, setOut] = useState<BuyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function buy() {
    setBuying(true);
    setOut(null);
    setLines([]);
    const push = (t: string, tone = 'dim') => setLines((p) => [...p, { t, tone }]);
    push(`$ agent → GET ${listing.x402Url.replace(/^https?:\/\//, '')}`, 'req');
    await wait(500);
    push(`← 402 Payment Required · ${price(listing)} · ${listing.network}`, 'warn');
    await wait(650);
    push('⊳ signing x402 payment…', 'dim');
    await wait(700);
    const res = await fetch(`/api/marketplace/${listing.slug}/buy`, { method: 'POST' });
    const data = (await res.json()) as BuyResponse;
    push(`← 200 OK · settled in ${data.receipt.settledMs}ms · builderCode=${data.receipt.builderCode}`, 'ok');
    setOut(data);
    setBuying(false);
  }

  function downloadMem() {
    if (!out?.memory) return;
    const blob = new Blob([out.memory.jsonl + '\n'], { type: 'application/x-ndjson' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${listing.slug}.jsonl`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function copyImport() {
    if (!out?.memory) return;
    await navigator.clipboard.writeText(out.memory.importCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const tone: Record<string, string> = { req: 'text-hyro-blue', warn: 'text-amber-500', ok: 'text-emerald-500', dim: 'text-hyro-dim' };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mt-[6vh] w-full max-w-2xl rounded-2xl border border-hyro-line/40 bg-hyro-bg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${kindBadge(listing.kind)}`}>{listing.kind}</span>
              <Badge variant="outline">{listing.category}</Badge>
              <span className="font-mono text-[10px] uppercase tracking-wider text-hyro-mute">{listing.live ? 'live' : 'sandbox'}</span>
            </div>
            <h2 className="font-mono text-2xl font-semibold text-hyro-ink">{listing.title}</h2>
          </div>
          <button onClick={onClose} className="text-hyro-mute hover:text-hyro-ink"><X className="h-5 w-5" /></button>
        </div>

        <p className="text-sm leading-relaxed text-hyro-dim">{listing.summary}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[12px]">
          {[
            ['price', price(listing)],
            ['seller', listing.seller],
            ['network', listing.network],
            ['builderCode', listing.builderCode],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-hyro-line/20 py-1">
              <dt className="text-hyro-mute">{k}</dt>
              <dd className="text-hyro-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 break-all font-mono text-[11px] text-hyro-mute">endpoint: {listing.x402Url}</p>

        {/* Buy */}
        <div className="mt-5">
          <Button onClick={buy} disabled={buying}>
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {buying ? 'Paying…' : `Buy · ${price(listing)}`}
          </Button>
          <span className="ml-3 font-mono text-[11px] text-hyro-mute">
            {listing.live ? 'settles real USDC on Base' : 'sandbox · no funds move'}
          </span>
        </div>

        {lines.length > 0 && (
          <div className="mt-4 rounded-xl border border-hyro-line/40 bg-[#070b12] p-4 font-mono text-[12px] leading-relaxed">
            {lines.map((l, i) => (
              <div key={i} className={tone[l.tone]}>{l.t}</div>
            ))}
          </div>
        )}

        {out && (
          <div className="mt-4 rounded-xl border border-emerald-300/40 bg-emerald-500/5 p-4">
            <p className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" /> settled · {out.receipt.id} · tx {short(out.receipt.txHash)}
            </p>
            {out.kind === 'memory' && out.memory ? (
              <div className="mt-3">
                <p className="mb-2 font-mono text-[11px] text-hyro-dim">{out.memory.items.length} memory records · import into your agent:</p>
                <pre className="max-h-40 overflow-auto rounded-lg border border-hyro-line/30 bg-hyro-panel/40 p-3 font-mono text-[11px] text-hyro-dim">
                  {out.memory.items.map((m) => `[${m.type}] ${m.content}`).join('\n')}
                </pre>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="rounded bg-[#070b12] px-3 py-1.5 font-mono text-[12px] text-hyro-blue">{out.memory.importCmd}</code>
                  <Button size="sm" variant="outline" onClick={copyImport}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />{copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadMem}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />Download .jsonl
                  </Button>
                </div>
              </div>
            ) : (
              <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-hyro-line/30 bg-hyro-panel/40 p-3 font-mono text-[11px] text-hyro-dim">
                {JSON.stringify(out.result, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PublishModal({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const [form, setForm] = useState<PublishInput>({ title: '', kind: 'skill', category: '', price: '', x402Url: '', summary: '', seller: '' });
  const [tags, setTags] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [genDesc, setGenDesc] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genCode, setGenCode] = useState('');
  const [genModel, setGenModel] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  const set = (k: keyof PublishInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function generate() {
    if (!genDesc.trim()) return;
    setGenerating(true);
    const res = await fetch('/api/marketplace/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ description: genDesc, kind: form.kind }),
    });
    const data = (await res.json()) as { title?: string; summary?: string; category?: string; price?: string; tags?: string[]; code?: string; model?: string };
    setGenerating(false);
    if (data.code) {
      setForm((f) => ({ ...f, title: data.title ?? f.title, summary: data.summary ?? f.summary, category: data.category ?? f.category, price: String(data.price ?? f.price) }));
      if (Array.isArray(data.tags)) setTags(data.tags.join(', '));
      setGenCode(data.code);
      setGenModel(data.model ?? '');
    }
  }
  async function copyCode() {
    await navigator.clipboard.writeText(genCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  }

  async function submit() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/marketplace', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }),
    });
    setBusy(false);
    if (res.ok) return onPublished();
    const data = (await res.json()) as { error?: string };
    setErr(data.error ?? 'Failed to publish');
  }

  const field = 'w-full rounded-lg border border-hyro-line/40 bg-hyro-panel/30 px-3 py-2 font-mono text-sm text-hyro-ink outline-none placeholder:text-hyro-mute focus:border-hyro-blue/50';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mt-[6vh] w-full max-w-lg rounded-2xl border border-hyro-line/40 bg-hyro-bg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-xl font-semibold text-hyro-ink">List a skill or memory pack</h2>
          <button onClick={onClose} className="text-hyro-mute hover:text-hyro-ink"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-4 text-[13px] leading-relaxed text-hyro-dim">
          Deploy your endpoint on Bankr x402 Cloud, then paste its URL here. HYRO reads the live 402 to confirm the price.
        </p>

        {/* Generate with HYRO */}
        <div className="mb-4 rounded-xl border border-hyro-blue/25 bg-hyro-blue/5 p-3">
          <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-hyro-blue">
            <Sparkles className="h-3.5 w-3.5" /> Generate with HYRO
          </p>
          <textarea
            className={field}
            rows={2}
            placeholder="Describe your skill, e.g. score a Base wallet for risk and return a 0-100 score"
            value={genDesc}
            onChange={(e) => setGenDesc(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" onClick={generate} disabled={generating || !genDesc.trim()}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {generating ? 'Generating…' : 'Generate skill'}
            </Button>
            {genModel && <span className="font-mono text-[10px] text-hyro-mute">via {genModel}</span>}
          </div>
          {genCode && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[10px] text-hyro-mute">Bankr handler — paste into `bankr x402 add`</span>
                <Button size="sm" variant="outline" onClick={copyCode}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {codeCopied ? 'Copied' : 'Copy code'}
                </Button>
              </div>
              <pre className="max-h-52 overflow-auto rounded-lg border border-hyro-line/30 bg-[#070b12] p-3 font-mono text-[11px] leading-relaxed text-hyro-dim">
                {genCode}
              </pre>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <input className={field} placeholder="Title" value={form.title} onChange={(e) => set('title', e.target.value)} />
          <div className="flex gap-3">
            <select className={field} value={form.kind} onChange={(e) => set('kind', e.target.value)}>
              <option value="skill">Skill</option>
              <option value="memory">Memory pack</option>
            </select>
            <input className={field} placeholder="Category (e.g. onchain)" value={form.category} onChange={(e) => set('category', e.target.value)} />
          </div>
          <input className={field} placeholder="x402 URL (https://x402.bankr.bot/0x…/name)" value={form.x402Url} onChange={(e) => set('x402Url', e.target.value)} />
          <div className="flex gap-3">
            <input className={field} placeholder="Price USD (auto from endpoint if live)" value={form.price} onChange={(e) => set('price', e.target.value)} />
            <input className={field} placeholder="Seller (@handle)" value={form.seller} onChange={(e) => set('seller', e.target.value)} />
          </div>
          <input className={field} placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
          <textarea className={field} placeholder="Summary" rows={2} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
        </div>

        {err && <p className="mt-3 font-mono text-[12px] text-red-500">{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? 'Publishing…' : 'Publish listing'}</Button>
        </div>
      </div>
    </div>
  );
}
