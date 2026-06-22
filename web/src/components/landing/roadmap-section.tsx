'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { SectionShell } from '@/components/landing/section-shell';
import { ROADMAP } from '@/lib/content';
import { cn } from '@/lib/utils';

export function RoadmapSection() {
  return (
    <SectionShell
      id="roadmap"
      label="roadmap"
      title="Shipping in public"
      description="Foundation is live. Runtime hardening, MCP GA, and marketplace teams are next on the roadmap."
      className="border-t border-hyro-line bg-hyro-panel/20"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ROADMAP.map((phase, i) => (
          <motion.article
            key={phase.tag}
            className={cn(
              'rounded-md border p-5 transition',
              phase.done
                ? 'border-hyro-blue/35 bg-hyro-blue/[0.04]'
                : 'border-hyro-line bg-hyro-panel/30',
            )}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-hyro-blue">{phase.tag}</span>
              {phase.done ? (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-hyro-green">
                  <Check className="h-3 w-3" />
                  Shipped
                </span>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-wider text-hyro-dim">
                  Planned
                </span>
              )}
            </div>
            <h3 className="mt-3 font-mono text-sm font-semibold text-hyro-ink">{phase.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-hyro-mute">{phase.desc}</p>
          </motion.article>
        ))}
      </div>
    </SectionShell>
  );
}
