'use client';

import * as React from 'react';
import { CONNECTED_SOURCES, INTEGRATIONS, SITE } from '@/lib/content';
import { HYRO_AGENTS } from '@/lib/playground/hyro-seed';
import { PLAYGROUND_MODELS } from '@/lib/playground/models';

/** Factual product scope — counts from the repo, not live telemetry. */
const STATS = [
  { to: HYRO_AGENTS.length, label: 'Agent personas' },
  { to: PLAYGROUND_MODELS.length, label: 'AI models' },
  { to: CONNECTED_SOURCES.filter((s) => s.connected).length, label: 'MCP sources live' },
  { to: INTEGRATIONS.length, label: 'Base integrations' },
] as const;

interface CounterProps {
  to: number;
  decimals?: number;
  pad?: number;
  suffix?: string;
}

function Counter({ to, decimals = 0, pad = 0, suffix = '' }: CounterProps) {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const render = (v: number) => {
      let s = v.toFixed(decimals);
      if (pad) s = s.padStart(pad, '0');
      el.textContent = s + suffix;
    };
    render(0);

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        if (reduce) {
          render(to);
          return;
        }
        const start = Date.now();
        const DUR = 1700;
        const id = setInterval(() => {
          const t = Math.min(1, (Date.now() - start) / DUR);
          const eased = 1 - Math.pow(1 - t, 3);
          render(eased * to);
          if (t >= 1) clearInterval(id);
        }, 30);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, decimals, pad, suffix]);

  return <span ref={ref} className="z-stat__num" />;
}

export function StatsSection() {
  return (
    <section className="z-stats" aria-label="HYRO product scope">
      <p className="z-stats__note">
        What ships in HYRO {SITE.version} — real counts from the codebase, not live network metrics.
      </p>
      <div className="z-stats__grid">
        {STATS.map((s) => (
          <div key={s.label} className="z-stat">
            <Counter to={s.to} />
            <span className="z-stat__label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
