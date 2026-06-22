'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Copy, Github, Rocket, Terminal } from 'lucide-react';
import { CliWindow } from '@/components/landing/cli-window';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { XIcon } from '@/components/ui/x-icon';
import { MANTRA, SITE } from '@/lib/content';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 sm:pt-28">
      <div className="shell px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge variant="live" className="mb-6">
              <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-hyro-blue" />
              Agent OS · v{SITE.version}
            </Badge>

            <h1 className="max-w-xl font-mono text-3xl font-semibold leading-[1.15] tracking-tight text-hyro-ink sm:text-4xl lg:text-[2.65rem]">
              <span className="text-hyro-blue term-glow">{SITE.name}</span>
              <br />
              <span className="text-hyro-mute">{SITE.tagline}</span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-hyro-mute sm:text-lg">
              {SITE.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {MANTRA.map((word, i) => (
                <span
                  key={word}
                  className="rounded-md border border-hyro-line/80 bg-white/[0.03] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-hyro-dim"
                >
                  <span className="text-hyro-faint">{String(i + 1).padStart(2, '0')}</span>
                  <span className="mx-2 text-hyro-faint">/</span>
                  <span className="text-hyro-blue">{word}</span>
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <Button size="lg" asChild>
                <Link href="/app">
                  <Rocket className="h-4 w-4" />
                  Launch App
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#cli">
                  <Terminal className="h-4 w-4" />
                  Install CLI
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
                <a href={SITE.x} target="_blank" rel="noopener noreferrer" aria-label="X @HyroCloud">
                  <XIcon className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
                <a href={SITE.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                  <Github className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="mt-8 space-y-2">
              <div className="flex max-w-lg items-center gap-2 rounded-lg border border-hyro-line/80 bg-hyro-panel/50 px-3 py-2.5 font-mono text-xs">
                <span className="shrink-0 text-hyro-faint">$</span>
                <code className="flex-1 truncate text-hyro-blue">{SITE.installFromGit}</code>
                <CopyButton text={SITE.installFromGit} />
              </div>
              <p className="font-mono text-[10px] text-hyro-dim">
                Repo:{' '}
                <a href={SITE.github} className="text-hyro-blue hover:underline" target="_blank" rel="noopener noreferrer">
                  github.com/hyro-cloud/hyro
                </a>
              </p>
            </div>
          </motion.div>

          <CliWindow className="w-full lg:justify-self-end" />
        </div>
      </div>
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-hyro-line/80 text-hyro-dim transition hover:border-hyro-blue hover:text-hyro-blue"
      aria-label="Copy install command"
    >
      {copied ? (
        <span className="text-[10px] text-hyro-green">OK</span>
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
