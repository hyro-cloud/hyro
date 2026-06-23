'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { HyroAsciiBanner } from '@/components/brand/hyro-ascii';
import { DASHBOARD_LIVE_SCRIPT, SITE } from '@/lib/content';
import { toneClass, useCliSimulation, type DisplayLine } from '@/hooks/use-cli-simulation';
import { TerminalChrome, terminalFrameClass } from '@/components/landing/terminal-shell';
import { cn } from '@/lib/utils';

interface CliWindowProps {
  className?: string;
}

/** Hero terminal — blue HYRO window with live typing demo */
export function CliWindow({ className }: CliWindowProps) {
  const { lines, typingText, isTyping } = useCliSimulation(true, DASHBOARD_LIVE_SCRIPT);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, typingText]);

  return (
    <motion.div
      className={cn('relative', terminalFrameClass, className)}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <TerminalChrome title={`hyro — ${SITE.version} — zsh`} />

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
          <div className="mt-1 whitespace-pre-wrap">
            <span className="text-hyro-blue">hyro ❯ </span>
            <span className="text-hyro-ink">{typingText}</span>
            <Cursor />
          </div>
        )}

        {!isTyping && !typingText && (
          <div className="mt-1">
            <span className="text-hyro-blue">hyro ❯ </span>
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
          <span className="text-hyro-blue">hyro ❯ </span>
          <span className="text-hyro-ink">{line.text}</span>
        </span>
      ) : (
        <span className={toneClass(line.tone)}>{line.text}</span>
      )}
    </div>
  );
}

function Cursor() {
  return (
    <span className="ml-px inline-block h-[1.1em] w-[7px] translate-y-[2px] animate-blink bg-hyro-blue" />
  );
}
