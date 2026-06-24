'use client';

import { motion } from 'framer-motion';
import { SectionShell } from '@/components/landing/section-shell';
import { MEMORY_TYPES } from '@/lib/content';

export function MemorySection() {
  return (
    <SectionShell
      id="memory"
      index="04"
      label="memory"
      title="Persistent agent memory"
      description="Facts, goals, preferences, conversations and state — stored in PostgreSQL with pgvector semantic recall, scoped per agent."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-hyro-dim">Memory types</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {MEMORY_TYPES.map((type, i) => (
              <motion.span
                key={type}
                className="rounded border border-hyro-line bg-hyro-panel px-3 py-2 font-mono text-xs capitalize text-hyro-mute"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <span className="mr-2 text-hyro-blue">::</span>
                {type}
              </motion.span>
            ))}
          </div>

          <ul className="mt-8 space-y-3 text-sm text-hyro-mute">
            <li className="flex gap-3">
              <span className="text-hyro-blue">→</span>
              Cosine ANN retrieval re-ranked by importance and recency
            </li>
            <li className="flex gap-3">
              <span className="text-hyro-blue">→</span>
              Export / import portable JSONL for backups and migrations
            </li>
            <li className="flex gap-3">
              <span className="text-hyro-blue">→</span>
              Works offline with a local embedder — zero API keys required
            </li>
          </ul>
        </div>

        <motion.div
          className="overflow-hidden rounded-lg border border-hyro-line bg-[#050408] font-mono text-[13px] sm:text-sm"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="border-b border-hyro-line px-4 py-2 text-[11px] text-hyro-dim">
            memory_search · pgvector · agent:research
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            <p>
              <span className="text-hyro-blue">hyro ❯ </span>
              <span className="text-hyro-ink">memory search &quot;Q3 launch blockers&quot;</span>
            </p>
            <div className="space-y-2 border-l border-hyro-line/60 pl-4">
              <p>
                <span className="text-hyro-cyan">[fact]</span>
                <span className="text-hyro-dim"> score 0.91 · </span>
                <span className="text-hyro-mute">API rate limits blocking staging deploy</span>
              </p>
              <p>
                <span className="text-hyro-cyan">[goal]</span>
                <span className="text-hyro-dim"> score 0.87 · </span>
                <span className="text-hyro-mute">Ship public beta before Oct 1</span>
              </p>
              <p>
                <span className="text-hyro-cyan">[state]</span>
                <span className="text-hyro-dim"> score 0.84 · </span>
                <span className="text-hyro-mute">Last triage: 3 issues labeled P1</span>
              </p>
            </div>
            <p className="text-hyro-dim">3 results · 12ms · hybrid rerank</p>
          </div>
        </motion.div>
      </div>
    </SectionShell>
  );
}
