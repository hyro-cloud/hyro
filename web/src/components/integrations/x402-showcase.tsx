'use client';

import Link from 'next/link';
import { ArrowRight, Cloud, Coins, ExternalLink, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BANKR_X402_GUIDE, INTEGRATION_URLS, X402_FLOW_GUIDE } from '@/lib/integrations/onchain';
import { SITE } from '@/lib/content';
import { X402Try } from './x402-try';

const FLOW_STEPS = [
  { n: '01', title: 'Request', body: 'Agent calls your API or MCP tool without credentials.' },
  { n: '02', title: '402', body: 'Server responds with USDC amount, network (Base), and recipient.' },
  { n: '03', title: 'Pay', body: 'Client signs x402 payment; Coinbase facilitator settles on Base.' },
  { n: '04', title: 'Retry', body: 'Request succeeds — data or tool result returned.' },
];

const BANKR_STEPS = [
  'bankr x402 init',
  '# Edit x402/<service>/index.ts — plain Request → Response handler',
  'bankr x402 deploy',
  'bankr x402 call https://x402.bankr.bot/<wallet>/<service> -i',
];

export function X402Showcase() {
  return (
    <div className="min-h-screen bg-hyro-bg pt-20 pb-16">
      <div className="shell px-4 sm:px-6">
        <header className="mb-10 border-b border-hyro-line/50 pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-hyro-blue">
            x402 · Bankr x402 Cloud · HYRO
          </p>
          <h1 className="mt-2 font-mono text-3xl font-semibold text-hyro-ink sm:text-4xl">
            Agent payments on Base
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hyro-dim">
            x402 embeds USDC payments in HTTP — no API keys, no checkout.{' '}
            <a
              href={INTEGRATION_URLS.bankrX402}
              target="_blank"
              rel="noopener noreferrer"
              className="text-hyro-blue hover:underline"
            >
              Bankr x402 Cloud
            </a>{' '}
            deploys paid endpoints; HYRO agents pay per tool call and tag Builder Codes onchain.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <a href={SITE.bankrX402} target="_blank" rel="noopener noreferrer">
                Bankr x402 Cloud
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/playground">x402 skills in Playground</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={SITE.x402Docs} target="_blank" rel="noopener noreferrer">
                x402 docs
              </a>
            </Button>
          </div>
        </header>

        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW_STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-xl border border-hyro-line/40 bg-hyro-panel/30 p-4"
            >
              <span className="font-mono text-[10px] text-hyro-blue">{s.n}</span>
              <p className="mt-1 font-mono text-[13px] font-medium text-hyro-ink">{s.title}</p>
              <p className="mt-1 text-[12px] text-hyro-dim">{s.body}</p>
            </div>
          ))}
        </div>

        <X402Try />

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 flex items-center gap-2 font-mono text-sm font-semibold text-hyro-ink">
              <Cloud className="h-4 w-4 text-hyro-blue" />
              Bankr x402 Cloud
            </h2>
            <p className="mb-4 text-[13px] leading-relaxed text-hyro-dim">
              Write a standard handler; Bankr wraps hosting, payment verification, and USDC settlement
              on Base. No x402 imports in your handler code.
            </p>
            <pre className="overflow-x-auto rounded-xl border border-hyro-line/40 bg-[#040810] p-4 font-mono text-[11px] leading-relaxed text-hyro-mute">
              {BANKR_STEPS.join('\n')}
            </pre>
            <a
              href={SITE.bankrX402Docs}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 font-mono text-[12px] text-hyro-blue hover:underline"
            >
              Full quick start
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-2 font-mono text-sm font-semibold text-hyro-ink">
              <Zap className="h-4 w-4 text-hyro-blue" />
              HYRO MCP + @x402/mcp
            </h2>
            <p className="mb-4 text-[13px] leading-relaxed text-hyro-dim">
              Monetize VPS MCP tools with{' '}
              <code className="text-hyro-blue">createPaymentWrapper</code> from{' '}
              <code className="text-hyro-blue">@x402/mcp</code>. Agents using{' '}
              <code className="text-hyro-blue">createX402MCPClient</code> auto-pay on 402.
            </p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-hyro-line/40 bg-hyro-panel/30 p-4 font-mono text-[11px] text-hyro-dim">
              {`import { createPaymentWrapper } from "@x402/mcp";

const paidTool = createPaymentWrapper(handler, {
  scheme: "exact",
  network: "eip155:8453",
  price: "$0.01",
  payTo: "0xYourWallet",
});`}
            </pre>
          </section>
        </div>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-hyro-line/40 bg-hyro-bg/40 p-5">
            <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-hyro-blue">
              <Coins className="h-3.5 w-3.5" />
              x402 flow
            </p>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-hyro-dim">
              {X402_FLOW_GUIDE}
            </pre>
          </div>
          <div className="rounded-xl border border-hyro-line/40 bg-hyro-bg/40 p-5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-hyro-blue">
              Bankr x402 guide
            </p>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-hyro-dim">
              {BANKR_X402_GUIDE}
            </pre>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/mcp"
            className="font-mono text-[12px] text-hyro-blue hover:underline"
          >
            Base MCP quickstart →
          </Link>
          <Link href="/b20" className="font-mono text-[12px] text-hyro-blue hover:underline">
            B20 + Builder Codes →
          </Link>
        </div>
      </div>
    </div>
  );
}
