'use client';

import { motion } from 'framer-motion';
import { SectionShell } from '@/components/landing/section-shell';
import { TerminalChrome, terminalFrameClass } from '@/components/landing/terminal-shell';
import { MCP_STEPS, MCP_TERMINAL_DEMO } from '@/lib/content';
import { cn } from '@/lib/utils';

export function McpSection() {
  return (
    <SectionShell
      id="mcp"
      index="03"
      label="mcp"
      title="Native MCP — Base · B20 · GitHub · DexScreener"
      description="Install servers on your VPS brain, grant tools per agent, and execute from the hyro dashboard. Deny-by-default."
      className="border-t border-hyro-line bg-hyro-panel/20"
    >
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <motion.div
          className={terminalFrameClass}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <TerminalChrome title="hyro — mcp install" />
          <div className="space-y-0.5 px-4 py-4 font-mono text-[12px] leading-relaxed sm:px-5 sm:text-[13px]">
            {MCP_TERMINAL_DEMO.map((line, i) => {
              if (line.startsWith('#')) {
                return (
                  <p key={i} className={cn(i > 0 && 'mt-3', 'text-hyro-dim')}>
                    {line}
                  </p>
                );
              }
              if (line.startsWith('hyro')) {
                const text = line.replace(/^hyro ❯ /, '').replace(/^hyro › /, '');
                return (
                  <p key={i} className="mt-2">
                    <span className="text-hyro-blue">hyro ❯ </span>
                    <span className="text-hyro-ink">{text}</span>
                  </p>
                );
              }
              if (line.startsWith('✔')) {
                return (
                  <p key={i} className="mt-1 text-hyro-green">
                    {line}
                  </p>
                );
              }
              if (line.startsWith('→')) {
                return (
                  <p key={i} className="mt-1 text-hyro-cyan">
                    {line}
                  </p>
                );
              }
              return (
                <p key={i} className="mt-1 text-hyro-dim">
                  {line}
                </p>
              );
            })}
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          {MCP_STEPS.map((step, i) => (
            <motion.article
              key={step.step}
              className="flex h-full flex-col rounded-lg border border-hyro-line/80 bg-hyro-panel/40 p-4"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <p className="font-mono text-xs text-hyro-faint">{step.step}</p>
              <h3 className="mt-2 font-mono text-sm font-semibold text-hyro-blue">{step.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-hyro-mute">{step.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
