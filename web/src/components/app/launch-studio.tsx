import Link from 'next/link';
import { ArrowUpRight, Coins, Github, Plug, Rocket, Terminal, Zap } from 'lucide-react';
import { SITE } from '@/lib/content';
import { IntegrationsStrip } from '@/components/landing/integrations-strip';
import { cn } from '@/lib/utils';

const PILLS = [
  { href: '/app', label: '✦ Launch Console', internal: true },
  { href: '/b20', label: '◆ B20 on Base', internal: true },
  { href: '/base', label: '◇ Base MCP', internal: true },
  { href: SITE.b20Docs, label: 'B20 docs', internal: false },
  { href: SITE.github, label: 'GitHub', internal: false },
] as const;

const CARDS = [
  {
    href: '/b20',
    icon: Coins,
    title: 'B20 · x402',
    desc: 'Native Base tokens + USDC pay-per-call. Builder Codes on every agent action.',
    cta: 'Open B20 studio →',
  },
  {
    href: '/base',
    icon: Plug,
    title: 'Base MCP',
    desc: 'get_balance, B20 token reads, b20_launch_guide — connect with `connect base`.',
    cta: 'Base integration →',
  },
  {
    href: '/#mcp',
    icon: Terminal,
    title: 'HYRO Dashboard',
    desc: 'Real `hyro` TUI: STATUS, CONNECTED SOURCES, chat, memory synced to VPS.',
    cta: 'See MCP →',
  },
  {
    href: SITE.bankr,
    icon: Zap,
    title: 'Bankr',
    desc: 'Onchain agent payments — HYRO agents settle USDC on Base, Bankr-compatible flows.',
    cta: 'bankr.bot →',
    external: true,
  },
  {
    href: SITE.github,
    icon: Github,
    title: 'Source on GitHub',
    desc: 'Clone hyro-cloud/hyro, build, install CLI — full MCP + MiMo brain on VPS.',
    cta: 'View repo →',
    external: true,
  },
] as const;

export function LaunchStudioHero() {
  return (
    <div className="mb-8 space-y-6">
      <IntegrationsStrip />

      <div className="flex flex-wrap gap-2">
        {PILLS.map((p) =>
          p.internal ? (
            <Link
              key={p.href}
              href={p.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-hyro-line/80 bg-hyro-panel/50 px-3.5 py-1.5 font-mono text-[11px] text-hyro-mute transition hover:border-hyro-blue/50 hover:text-hyro-blue"
            >
              {p.label}
            </Link>
          ) : (
            <a
              key={p.href}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-hyro-line/80 bg-hyro-panel/50 px-3.5 py-1.5 font-mono text-[11px] text-hyro-mute transition hover:border-hyro-blue/50 hover:text-hyro-blue"
            >
              {p.label}
              <ArrowUpRight className="h-3 w-3" />
            </a>
          ),
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-hyro-blue/30 bg-hyro-blue/[0.06] px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-hyro-blue">
            <Rocket className="h-3 w-3" />
            HYRO Agent Studio · B20 · Base MCP · x402
          </div>
          <h1 className="font-mono text-3xl font-semibold tracking-tight text-hyro-ink sm:text-4xl">
            Launch the <span className="text-hyro-blue term-glow">HYRO agent</span>
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-hyro-mute">
            Real <span className="text-hyro-ink">hyro</span> dashboard on your machine — DexScreener,
            GitHub, Base MCP with B20 tools, x402 USDC, and Bankr-ready onchain flows. Memory syncs to
            your VPS brain.
          </p>
        </div>

        <div className="rounded-xl border border-hyro-line/80 bg-gradient-to-br from-hyro-blue/[0.08] to-transparent p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-hyro-dim">Quick start</p>
          <code className="mt-2 block whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-hyro-blue">
            {`hyro login\nhyro\nconnect base\nconnect github\nchat`}
          </code>
          <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-hyro-dim">
            <Zap className="h-3 w-3 text-hyro-blue" />
            Sepolia: <span className="text-hyro-ink">BASE_RPC_URL=https://sepolia.base.org</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function LaunchStudioCards() {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CARDS.map((c) => {
        const Icon = c.icon;
        const inner = (
          <>
            <Icon className="h-4 w-4 text-hyro-blue" />
            <h3 className="mt-3 font-mono text-sm font-semibold text-hyro-ink">{c.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-hyro-mute">{c.desc}</p>
            <span className="mt-auto inline-block pt-4 font-mono text-[11px] text-hyro-blue">{c.cta}</span>
          </>
        );
        const cls = cn(
          'group flex h-full flex-col rounded-xl border border-hyro-line/80 bg-hyro-panel/30 p-5 transition',
          'hover:border-hyro-blue/40 hover:bg-hyro-blue/[0.04]',
        );
        if ('external' in c && c.external) {
          return (
            <a key={c.title} href={c.href} target="_blank" rel="noopener noreferrer" className={cls}>
              {inner}
            </a>
          );
        }
        return (
          <Link key={c.title} href={c.href} className={cls}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
