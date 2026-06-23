'use client';

import { motion } from 'framer-motion';
import { SectionShell } from '@/components/landing/section-shell';
import { HyroDashboardTerminal } from '@/components/landing/hyro-dashboard-terminal';
import { Button } from '@/components/ui/button';
import { CLI_COMMANDS, SITE } from '@/lib/content';

export function CliSection() {
  return (
    <SectionShell
      id="cli"
      label="cli"
      title="The CLI is the product"
      description="Run hyro for the real dashboard TUI — STATUS, CONNECTED SOURCES, chat, memory on VPS. Base MCP + B20 + x402 built in."
      className="border-t border-hyro-line bg-hyro-panel/20"
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="space-y-2.5">
          {CLI_COMMANDS.map((row, i) => (
            <motion.div
              key={row.cmd}
              className="group grid gap-1 rounded-lg border border-hyro-line/80 bg-hyro-panel/40 px-4 py-3 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-center sm:gap-4"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <code className="font-mono text-sm text-hyro-blue transition group-hover:text-hyro-blue-hi">
                {row.cmd}
              </code>
              <span className="text-sm leading-relaxed text-hyro-dim">{row.desc}</span>
            </motion.div>
          ))}

          <div className="pt-5">
            <Button asChild>
              <a href={`${SITE.github}/blob/main/docs/CLI.md`} target="_blank" rel="noopener noreferrer">
                Read CLI docs on GitHub
              </a>
            </Button>
          </div>
        </div>

        <motion.div
          className="space-y-3 lg:sticky lg:top-28"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <HyroDashboardTerminal compact />
          <p className="text-center font-mono text-[11px] leading-relaxed text-hyro-dim">
            Same layout as <span className="text-hyro-ink">hyro</span> on Windows · macOS · Linux
          </p>
        </motion.div>
      </div>
    </SectionShell>
  );
}
