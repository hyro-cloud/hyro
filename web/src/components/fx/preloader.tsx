'use client';

import * as React from 'react';

const LINES = [
  'INITIALIZING CORE…',
  'MOUNTING MEMORY ENGINE…',
  'HANDSHAKE · MCP HUB…',
  'GATEWAY READY.',
];

/**
 * ZAPP-style boot preloader, HYRO blue. Counts to 100, swaps status lines,
 * then fades out. Skips instantly if the user prefers reduced motion.
 */
export function Preloader() {
  const [pct, setPct] = React.useState(0);
  const [line, setLine] = React.useState(LINES[0]);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDone(true);
      return;
    }

    const start = Date.now();
    const DURATION = 1700;

    // Interval-based (keeps progressing even when the tab is backgrounded,
    // where requestAnimationFrame is paused/throttled).
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 2); // ease-out
      const value = Math.round(eased * 100);
      setPct(value);
      setLine(LINES[Math.min(LINES.length - 1, Math.floor((value / 100) * LINES.length))]);
      if (t >= 1) {
        clearInterval(id);
        setTimeout(() => setDone(true), 320);
      }
    }, 40);

    // Hard safety cap: never let the overlay trap the page.
    const cap = setTimeout(() => setDone(true), DURATION + 1200);

    return () => {
      clearInterval(id);
      clearTimeout(cap);
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-hyro-bg transition-opacity duration-300"
      style={{ opacity: pct >= 100 ? 0 : 1 }}
    >
      <HexBolt className="h-16 w-16 animate-pulseDot text-hyro-blue" />
      <div className="mt-7 flex w-[240px] items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-hyro-dim">
        <span>{line}</span>
        <span className="text-hyro-blue">{String(pct).padStart(3, '0')}</span>
      </div>
      <div className="mt-3 h-px w-[240px] overflow-hidden bg-hyro-line">
        <span
          className="block h-full bg-hyro-blue transition-[width] duration-100"
          style={{ width: `${pct}%`, boxShadow: '0 0 12px rgba(59,140,255,0.7)' }}
        />
      </div>
    </div>
  );
}

function HexBolt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <polygon
        points="32,4 56.2,18 56.2,46 32,60 7.8,46 7.8,18"
        stroke="currentColor"
        strokeWidth="2"
        fill="rgba(59,140,255,0.06)"
      />
      <path d="M37 13 L20 35 L30 35 L27 51 L45 28 L34 28 L41 13 Z" fill="currentColor" />
    </svg>
  );
}
