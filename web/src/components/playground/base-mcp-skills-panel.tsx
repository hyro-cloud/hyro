'use client';

import { useMemo, useState } from 'react';
import {
  BASE_MCP_SKILL_CATEGORIES,
  BASE_MCP_SKILLS,
  skillChatPrefix,
  type SkillCategory,
} from '@/lib/playground/base-mcp-skills';
import { cn } from '@/lib/utils';
import { BarChart3, Cloud, Coins, Fuel, Lock, Plug, Rocket, Search, Zap } from 'lucide-react';

const CATEGORY_ICONS: Partial<Record<SkillCategory, React.ReactNode>> = {
  quickstart: <Plug className="h-3 w-3" />,
  x402: <Coins className="h-3 w-3" />,
  bankr: <Cloud className="h-3 w-3" />,
  dex: <Search className="h-3 w-3" />,
  base: <Zap className="h-3 w-3" />,
  b20: <Rocket className="h-3 w-3" />,
  transfers: <Zap className="h-3 w-3" />,
  data: <Fuel className="h-3 w-3" />,
};

interface BaseMcpSkillsPanelProps {
  onInsertSkill: (text: string) => void;
  disabled?: boolean;
}

export function BaseMcpSkillsPanel({ onInsertSkill, disabled }: BaseMcpSkillsPanelProps) {
  const [category, setCategory] = useState<SkillCategory | 'all'>('all');

  const filtered = useMemo(() => {
    if (category === 'all') return BASE_MCP_SKILLS;
    return BASE_MCP_SKILLS.filter((s) => s.category === category);
  }, [category]);

  return (
    <section className="rounded-[10px] border border-hyro-line/20 bg-hyro-panel/30 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-hyro-blue">
            Onchain skills — Base MCP · x402 · Bankr
          </h2>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-hyro-dim">
            Click a skill to fill the message box — edit if needed, then press Enter. Local reads run
            instantly; wallet/send/swap prompts need{' '}
            <a
              href="https://mcp.base.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-hyro-blue hover:underline"
            >
              mcp.base.org
            </a>
            .
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded border border-hyro-blue/40 bg-hyro-blue/10 px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-hyro-blue">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-hyro-blue" />
          Live
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wide transition',
            category === 'all'
              ? 'border-hyro-blue/60 bg-hyro-blue/10 text-hyro-blue'
              : 'border-hyro-line/25 text-hyro-dim hover:border-hyro-blue/40',
          )}
        >
          <BarChart3 className="h-3 w-3" />
          All
        </button>
        {BASE_MCP_SKILL_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wide transition',
              category === c.id
                ? 'border-hyro-blue/60 bg-hyro-blue/10 text-hyro-blue'
                : 'border-hyro-line/25 text-hyro-dim hover:border-hyro-blue/40',
            )}
          >
            {CATEGORY_ICONS[c.id]}
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((skill) => (
          <button
            key={skill.id}
            type="button"
            disabled={disabled}
            onClick={() => onInsertSkill(`${skillChatPrefix(skill.id)}${skill.chatInsert}`)}
            className="group rounded-[10px] border border-hyro-line/20 bg-hyro-bg/40 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-hyro-blue/40 hover:bg-hyro-panel/40 disabled:opacity-50"
          >
            <p className="font-mono text-[12px] font-medium text-hyro-ink group-hover:text-hyro-blue">
              {skill.title}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-hyro-dim">{skill.description}</p>
            <span className="mt-2.5 inline-block rounded border border-hyro-blue/25 bg-hyro-blue/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-hyro-blue/90">
              {skill.toolLabel}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-4 flex items-center gap-2 font-mono text-[10px] text-hyro-faint">
        <Lock className="h-3 w-3 shrink-0" />
        Your keys, your rules — agent only prepares, you sign every tx.
      </p>
    </section>
  );
}
