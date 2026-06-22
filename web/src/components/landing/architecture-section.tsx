'use client';

import { motion } from 'framer-motion';
import { SectionShell } from '@/components/landing/section-shell';
import { ARCHITECTURE_LAYERS } from '@/lib/content';
import { cn } from '@/lib/utils';

const COLOR_MAP = {
  blue: 'border-hyro-blue/30 text-hyro-blue',
  cyan: 'border-hyro-cyan/30 text-hyro-cyan',
  green: 'border-hyro-green/30 text-hyro-green',
} as const;

export function ArchitectureSection() {
  return (
    <SectionShell
      id="architecture"
      label="architecture"
      title="Four layers, one runtime"
      description="Terminal-first interface, durable orchestration, MCP connectivity, and vector memory — composed as a single agent operating system."
    >
      <div className="relative">
        <div className="absolute left-4 top-0 hidden h-full w-px bg-gradient-to-b from-hyro-blue/40 via-hyro-line to-transparent sm:left-6 lg:block" />

        <div className="grid gap-4">
          {ARCHITECTURE_LAYERS.map((layer, i) => (
            <motion.article
              key={layer.layer}
              className="relative rounded-lg border border-hyro-line bg-hyro-panel/40 p-5 sm:pl-12 lg:pl-14"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <span className="absolute left-3 top-6 hidden h-2 w-2 rounded-full bg-hyro-blue lg:block" />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-hyro-dim">
                    Layer {i + 1}
                  </p>
                  <h3 className="mt-1 font-mono text-lg font-semibold text-hyro-ink">{layer.layer}</h3>
                </div>
                <ul className="flex flex-wrap gap-2 sm:max-w-md sm:justify-end">
                  {layer.items.map((item) => (
                    <li
                      key={item}
                      className={cn(
                        'rounded border bg-black/20 px-2.5 py-1 font-mono text-[11px]',
                        COLOR_MAP[layer.color],
                      )}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          className="mt-8 overflow-x-auto rounded-lg border border-hyro-line bg-[#050408] p-4 font-mono text-[11px] leading-relaxed text-hyro-dim sm:text-xs"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <pre className="min-w-[520px]">{`┌─────────────┐     SSE      ┌──────────────┐     MCP      ┌─────────────┐
│  HYRO CLI   │ ───────────► │   Runtime    │ ◄──────────► │  MCP Hub    │
│  + SDK      │   REST API   │  Orchestrator│   tools/call │  Registry   │
└──────┬──────┘              └──────┬───────┘              └─────────────┘
       │                            │
       │                     ┌──────▼───────┐
       │                     │  PostgreSQL  │
       └────────────────────►│  + pgvector  │
                             │  + Redis     │
                             └──────────────┘`}</pre>
        </motion.div>
      </div>
    </SectionShell>
  );
}
