'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Coins,
  Fuel,
  Network,
  Receipt,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { SectionShell } from '@/components/landing/section-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XIcon } from '@/components/ui/x-icon';
import {
  BASE_HERO,
  BASE_SOURCES,
  BASE_USECASES,
  BASE_VALUE,
  BUILDER_CODES,
  BUILDER_SNIPPET,
  SITE,
  X402_FLOW,
  type BaseIcon,
} from '@/lib/content';

const ICONS: Record<BaseIcon, LucideIcon> = {
  Coins,
  ShieldCheck,
  Fuel,
  Receipt,
  BadgeCheck,
  Network,
  Boxes,
  Trophy,
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

function TerminalCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-hyro-line bg-hyro-panel/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-hyro-line bg-hyro-blue/[0.04] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-hyro-red/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-hyro-green/80" />
        <span className="ml-2 font-mono text-xs text-hyro-dim">{title}</span>
      </div>
      <div className="space-y-1 p-5 font-mono text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}

export function BaseShowcase() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="scroll-mt-24 pt-28 pb-12 sm:pt-32">
        <div className="shell grid items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge variant="live">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulseDot rounded-full bg-hyro-blue" />
              {BASE_HERO.badge}
            </Badge>
            <h1 className="mt-5 font-mono text-4xl font-semibold tracking-tight text-hyro-ink sm:text-5xl">
              HYRO <span className="text-hyro-blue term-glow">×</span> Base
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-hyro-mute sm:text-lg">
              {BASE_HERO.subtitle}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild>
                <a href={SITE.x402Docs} target="_blank" rel="noopener noreferrer">
                  Read the x402 docs
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={SITE.baseAnnouncement} target="_blank" rel="noopener noreferrer">
                  <XIcon className="h-3.5 w-3.5" />
                  Build on Base
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back home
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <TerminalCard title="x402 — exchange">
              <p className="text-hyro-mute">
                <span className="text-hyro-blue">agent</span> ▸ GET https://api.tool/run
              </p>
              <p className="text-hyro-dim">← 402 Payment Required</p>
              <p className="text-hyro-dim">
                {'  '}x402: {'{'} asset: <span className="text-hyro-ink">USDC</span>, amount:{' '}
                <span className="text-hyro-ink">0.01</span>, network:{' '}
                <span className="text-hyro-cyan">base</span> {'}'}
              </p>
              <p className="pt-1 text-hyro-mute">
                <span className="text-hyro-blue">hyro</span> x402 pay --network base --usdc 0.01
              </p>
              <p className="text-hyro-green">
                {'  '}✔ settled on Base · builderCode=<span className="text-hyro-blue">hyro</span>
              </p>
              <p className="text-hyro-green">← 200 OK · resource unlocked</p>
            </TerminalCard>
          </motion.div>
        </div>
      </section>

      {/* ---- Why Base ---- */}
      <SectionShell
        id="why-base"
        label="why base"
        title="An onchain settlement & attribution layer for agents"
        description="x402 gives HYRO agents a native payment rail; Base gives it instant USDC settlement and an attribution standard so value is measurable."
      >
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {BASE_VALUE.map((v) => {
            const Icon = ICONS[v.icon];
            return (
              <motion.div key={v.idx} variants={item}>
                <Card className="group h-full transition hover:border-hyro-blue/40 hover:bg-hyro-panel">
                  <CardHeader>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-xs text-hyro-faint">{v.idx}</span>
                      <Icon className="h-4 w-4 text-hyro-blue transition group-hover:scale-110" />
                    </div>
                    <CardTitle className="normal-case tracking-normal text-hyro-ink">{v.title}</CardTitle>
                    <CardDescription>{v.body}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </SectionShell>

      {/* ---- x402 flow ---- */}
      <SectionShell
        id="x402"
        label="x402 // pay over http"
        title="Payment Required, automated"
        description="x402 revives the HTTP 402 status code: when a resource needs payment, the agent pays in USDC and retries — no API keys, no checkout, no human in the loop."
      >
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {X402_FLOW.map((s) => (
            <motion.div key={s.code} variants={item}>
              <Card className="h-full">
                <CardHeader>
                  <span className="inline-flex w-fit rounded border border-hyro-line bg-hyro-blue/5 px-2.5 py-1 font-mono text-sm font-semibold text-hyro-blue">
                    {s.code}
                  </span>
                  <CardTitle className="mt-3 normal-case tracking-normal text-hyro-ink">
                    {s.title}
                  </CardTitle>
                  <CardDescription>{s.body}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </SectionShell>

      {/* ---- Builder Codes ---- */}
      <SectionShell
        id="builder-codes"
        label="builder codes // erc-8021"
        title="Verifiable credit for the work agents do"
        description="Builder Codes append a standardized suffix to transaction calldata so the apps, wallets and agents that drive activity get attributed — and can route rewards to a payout address onchain."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            className="grid gap-4 sm:grid-cols-2"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            {BUILDER_CODES.map((b) => {
              const Icon = ICONS[b.icon];
              return (
                <motion.div key={b.title} variants={item}>
                  <Card className="h-full">
                    <CardHeader>
                      <Icon className="mb-3 h-5 w-5 text-hyro-blue" />
                      <CardTitle className="normal-case tracking-normal text-hyro-ink">{b.title}</CardTitle>
                      <CardDescription>{b.body}</CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true, margin: '-80px' }}
          >
            <div className="overflow-hidden rounded-md border border-hyro-line bg-hyro-panel/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b border-hyro-line bg-hyro-blue/[0.04] px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-hyro-red/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-hyro-green/80" />
                <span className="ml-2 font-mono text-xs text-hyro-dim">hyro/base.ts</span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-hyro-mute">
                <code>{BUILDER_SNIPPET}</code>
              </pre>
            </div>
            <p className="mt-3 font-mono text-[11px] text-hyro-dim">
              ▹ Illustrative — shows how HYRO threads x402 payments and Builder Codes. Base adapter is on the roadmap.
            </p>
          </motion.div>
        </div>
      </SectionShell>

      {/* ---- How HYRO uses Base ---- */}
      <SectionShell
        id="base-usecases"
        label="on hyro"
        title="What this unlocks for HYRO"
        description="Agentic payments plus onchain attribution turn HYRO into a measurable, monetizable participant in the Base economy."
      >
        <motion.div
          className="grid gap-4 sm:grid-cols-2"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          {BASE_USECASES.map((u) => (
            <motion.div key={u.idx} variants={item}>
              <Card className="group h-full transition hover:border-hyro-blue/40">
                <CardHeader>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-sm text-hyro-blue">{u.idx}</span>
                    <CardTitle className="normal-case tracking-normal text-hyro-ink">{u.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-1">{u.body}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </SectionShell>

      {/* ---- Sources ---- */}
      <SectionShell
        id="base-sources"
        label="references"
        title="Sources & further reading"
        description="This page is grounded in the official x402 and Base Builder Codes documentation."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {BASE_SOURCES.map((s) => (
            <a
              key={s.href}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-4 rounded-md border border-hyro-line bg-hyro-panel/60 px-5 py-4 transition hover:border-hyro-blue/40 hover:bg-hyro-panel"
            >
              <span>
                <span className="block text-sm text-hyro-ink transition group-hover:text-hyro-blue">
                  {s.label}
                </span>
                <span className="mt-0.5 block font-mono text-xs text-hyro-dim">{s.note}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-hyro-dim transition group-hover:text-hyro-blue" />
            </a>
          ))}
        </div>
      </SectionShell>
    </>
  );
}
