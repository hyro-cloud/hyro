'use client';

import { motion } from 'framer-motion';
import { SectionShell } from '@/components/landing/section-shell';
import { Button } from '@/components/ui/button';
import { CLI_COMMANDS, SITE } from '@/lib/content';

export function CliSection() {
  return (
    <SectionShell
      id="cli"
      label="cli"
      title="The CLI is the product"
      description="A hacker-grade terminal with a live REPL and one-shot commands. Run offline with zero keys, or connect to HYRO Cloud for durable execution."
      className="border-t border-hyro-line bg-hyro-panel/20"
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          {CLI_COMMANDS.map((row, i) => (
            <motion.div
              key={row.cmd}
              className="group flex flex-col gap-1 rounded-md border border-hyro-line bg-hyro-panel/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <code className="font-mono text-sm text-hyro-blue transition group-hover:text-hyro-blue-hi">
                {row.cmd}
              </code>
              <span className="text-sm text-hyro-dim">{row.desc}</span>
            </motion.div>
          ))}

          <div className="pt-4">
            <Button asChild>
              <a href={SITE.github} target="_blank" rel="noopener noreferrer">
                Read CLI docs
              </a>
            </Button>
          </div>
        </div>

        <motion.div
          className="rounded-lg border border-hyro-line bg-[#050408] p-5 font-mono text-sm"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-hyro-dim"># Quick start — works offline</p>
          <p className="mt-4">
            <span className="text-hyro-blue">$ </span>
            <span className="text-hyro-ink">{SITE.install}</span>
          </p>
          <p className="mt-3">
            <span className="text-hyro-blue">$ </span>
            <span className="text-hyro-ink">hyro</span>
          </p>
          <p className="mt-2 pl-4 text-hyro-dim">→ Interactive REPL when attached to a TTY</p>
          <p className="mt-4">
            <span className="text-hyro-blue">$ </span>
            <span className="text-hyro-ink">hyro run &quot;summarize today&apos;s standup notes&quot;</span>
          </p>
          <p className="mt-2 text-hyro-green">✔ offline · 4 steps · local memory</p>
          <p className="mt-6 text-hyro-dim">
            Observe · Decide · Execute · Remember
          </p>
        </motion.div>
      </div>
    </SectionShell>
  );
}
