'use client';

import Link from 'next/link';
import { ArrowRight, ExternalLink, Plug, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BASE_MCP_QUICKSTART_GUIDE, BASE_MCP_URL, INTEGRATION_URLS } from '@/lib/integrations/onchain';
import { SITE } from '@/lib/content';

const CURSOR_MCP_JSON = `{
  "mcpServers": {
    "base-mcp": {
      "url": "${BASE_MCP_URL}"
    }
  }
}`;

const INSTALL_STEPS = [
  {
    title: 'Connect Base MCP',
    body: 'Add the remote MCP server — OAuth via Base Account on first use.',
    cmds: [
      `claude mcp add --transport http base-mcp ${BASE_MCP_URL}`,
      'npx skills add base/skills --skill base-mcp -a cursor',
    ],
  },
  {
    title: 'HYRO VPS + CLI',
    body: 'Local chain reads via hyro-mcp-base; official wallet tools via mcp.base.org.',
    cmds: ['hyro mcp install base', 'hyro connect base', 'hyro mcp list'],
  },
  {
    title: 'Try in Playground',
    body: 'Click Base MCP skills — USDC balance, guides, DexScreener. Wallet/send uses official MCP.',
    cmds: [],
  },
];

const TRY_PROMPTS = [
  'Show me my wallets',
  "What's my USDC balance on Base?",
  'Send 1 USDC to jesse.base.eth',
  'Find the highest paying USDC yield on Base by APY and deposit 100 USDC',
];

export function McpQuickstartPage() {
  return (
    <div className="min-h-screen bg-hyro-bg pt-20 pb-16">
      <div className="shell px-4 sm:px-6">
        <header className="mb-10 border-b border-hyro-line/50 pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-hyro-blue">
            Base MCP · HYRO integration
          </p>
          <h1 className="mt-2 font-mono text-3xl font-semibold text-hyro-ink sm:text-4xl">
            Connect Base MCP
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hyro-dim">
            Official Base Account tools — wallets, portfolio, send, swap, x402 payments, and partner
            plugins (Morpho, Uniswap, Bankr, …). HYRO ships local read tools + this quickstart; full
            wallet flows use{' '}
            <a href={BASE_MCP_URL} className="text-hyro-blue hover:underline" target="_blank" rel="noopener noreferrer">
              mcp.base.org
            </a>
            .
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href="/playground">Open Playground</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={INTEGRATION_URLS.baseMcpQuickstart} target="_blank" rel="noopener noreferrer">
                Base docs
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={INTEGRATION_URLS.baseMcpSkill} target="_blank" rel="noopener noreferrer">
                base-mcp skill
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 font-mono text-sm font-semibold text-hyro-ink">
              <Plug className="h-4 w-4 text-hyro-blue" />
              Cursor · Claude · HYRO
            </h2>
            {INSTALL_STEPS.map((step) => (
              <div
                key={step.title}
                className="rounded-xl border border-hyro-line/40 bg-hyro-panel/30 p-5"
              >
                <p className="font-mono text-[13px] font-medium text-hyro-ink">{step.title}</p>
                <p className="mt-1 text-[12px] text-hyro-dim">{step.body}</p>
                {step.cmds.length > 0 && (
                  <pre className="mt-3 overflow-x-auto rounded-lg border border-hyro-line/30 bg-hyro-bg/80 p-3 font-mono text-[11px] text-hyro-mute">
                    {step.cmds.join('\n')}
                  </pre>
                )}
              </div>
            ))}
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 font-mono text-sm font-semibold text-hyro-ink">
              <Terminal className="h-4 w-4 text-hyro-blue" />
              .cursor/mcp.json
            </h2>
            <pre className="overflow-x-auto rounded-xl border border-hyro-line/40 bg-[#040810] p-4 font-mono text-[12px] leading-relaxed text-hyro-mute">
              {CURSOR_MCP_JSON}
            </pre>
            <p className="text-[12px] text-hyro-dim">
              Included in this repo. Restart Cursor → Settings → MCP → confirm{' '}
              <code className="text-hyro-blue">base-mcp</code> is active.
            </p>

            <h3 className="pt-4 font-mono text-[11px] uppercase tracking-wider text-hyro-faint">
              Try it (official Base MCP)
            </h3>
            <ul className="space-y-2">
              {TRY_PROMPTS.map((p) => (
                <li
                  key={p}
                  className="rounded-lg border border-hyro-line/30 bg-hyro-bg/50 px-3 py-2 font-mono text-[12px] text-hyro-mute"
                >
                  {p}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-hyro-faint">
              Writes return an approval link — open in Base Account and confirm.
            </p>
          </section>
        </div>

        <section className="mt-10 rounded-xl border border-dashed border-hyro-line/40 bg-hyro-bg/40 p-5">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-hyro-blue">
            HYRO local quickstart (playground)
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-hyro-dim">
            {BASE_MCP_QUICKSTART_GUIDE}
          </pre>
          <Link
            href="/playground"
            className="mt-4 inline-flex items-center gap-1 font-mono text-[12px] text-hyro-blue hover:underline"
          >
            Run skills in Playground
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        <p className="mt-8 text-center font-mono text-[10px] text-hyro-faint">
          API brain {SITE.apiUrl} · {SITE.github}
        </p>
      </div>
    </div>
  );
}
