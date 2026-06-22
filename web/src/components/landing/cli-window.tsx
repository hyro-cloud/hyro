'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { HyroAsciiBanner } from '@/components/brand/hyro-ascii';
import { toneClass, useCliSimulation, type DisplayLine } from '@/hooks/use-cli-simulation';
import { SITE } from '@/lib/content';
import { cn } from '@/lib/utils';

interface CliWindowProps {
  className?: string;
}

export function CliWindow({ className }: CliWindowProps) {
  const { lines, typingText, isTyping } = useCliSimulation(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, typingText]);

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-xl border border-hyro-line/80 bg-[#040810] shadow-[0_0_0_1px_rgba(59,140,255,0.06),0_32px_64px_-24px_rgba(0,0,0,0.85),0_0_48px_-16px_rgba(59,140,255,0.18)]',
        className,
      )}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-3 border-b border-hyro-line/70 bg-hyro-panel/80 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/90" />
        </div>
        <div className="flex-1 text-center font-mono text-[10px] tracking-wide text-hyro-dim">
          hyro — {SITE.version} — zsh
        </div>
        <div className="hidden w-[52px] sm:block" />
      </div>

      <div
        ref={scrollRef}
        className="relative z-[1] h-[420px] overflow-y-auto overflow-x-hidden px-4 py-4 font-mono text-[12.5px] leading-relaxed sm:h-[460px] sm:px-5 sm:text-[13px]"
        aria-live="polite"
        aria-label="HYRO CLI simulation"
      >
        <HyroAsciiBanner version={SITE.version} />

        {lines.map((line) => (
          <TerminalLine key={line.id} line={line} />
        ))}

        {(isTyping || typingText) && (
          <div className="whitespace-pre-wrap">
            <Prompt />
            <span className="text-hyro-ink">{typingText}</span>
            <Cursor />
          </div>
        )}

        {!isTyping && !typingText && (
          <div className="mt-1">
            <Prompt />
            <Cursor />
          </div>
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_50%_0%,rgba(59,140,255,0.05),transparent_50%)]"
        aria-hidden
      />
    </motion.div>
  );
}

function TerminalLine({ line }: { line: DisplayLine }) {
  return (
    <div className="whitespace-pre-wrap break-words">
      {line.kind === 'cmd' ? (
        <span>
          <Prompt />
          <span className="text-hyro-ink">{line.text}</span>
        </span>
      ) : (
        <span className={toneClass(line.tone)}>{line.text}</span>
      )}
    </div>
  );
}

function Prompt() {
  return <span className="text-hyro-blue">hyro ❯ </span>;
}

function Cursor() {
  return (
    <span className="ml-px inline-block h-[1.1em] w-[7px] translate-y-[2px] animate-blink bg-hyro-blue" />
  );
}
