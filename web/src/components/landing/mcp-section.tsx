'use client';

import { motion } from 'framer-motion';
import { SectionShell } from '@/components/landing/section-shell';
import { MCP_STEPS } from '@/lib/content';

export function McpSection() {
  return (
    <SectionShell
      id="mcp"
      label="mcp"
      title="Native Model Context Protocol"
      description="Install servers, discover tools, grant permissions, and execute — all from the same HYRO terminal you use to run agents."
      className="border-t border-hyro-line bg-hyro-panel/20"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          className="rounded-lg border border-hyro-line bg-[#050408] p-5 font-mono text-sm sm:p-6"
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-hyro-dim"># Grant github tools to research-agent</p>
          <p className="mt-3">
            <span className="text-hyro-blue">hyro ❯ </span>
            <span className="text-hyro-ink">mcp install @hyro/github</span>
          </p>
          <p className="mt-2 text-hyro-green">✔ Installed github-mcp v1.2.0</p>
          <p className="mt-4">
            <span className="text-hyro-blue">hyro ❯ </span>
            <span className="text-hyro-ink">mcp grant research-agent github__search_issues</span>
          </p>
          <p className="mt-2 text-hyro-green">✔ Granted 1 tool · deny-by-default for others</p>
          <p className="mt-4">
            <span className="text-hyro-blue">hyro ❯ </span>
            <span className="text-hyro-ink">mcp list --agent research-agent</span>
          </p>
          <p className="mt-2 text-hyro-cyan">→ github__search_issues</p>
          <p className="mt-2 text-hyro-dim">  memory_search · think · (builtin)</p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          {MCP_STEPS.map((step, i) => (
            <motion.article
              key={step.step}
              className="rounded-md border border-hyro-line bg-hyro-panel/50 p-4"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <p className="font-mono text-xs text-hyro-faint">{step.step}</p>
              <h3 className="mt-2 font-mono text-sm font-semibold text-hyro-blue">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-hyro-mute">{step.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
