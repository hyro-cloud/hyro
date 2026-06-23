'use client';

import { HyroAsciiLogo } from '@/components/brand/hyro-ascii';
import { CONNECTED_SOURCES, SITE } from '@/lib/content';
import { TerminalChrome, terminalFrameClass } from '@/components/landing/terminal-shell';
import { cn } from '@/lib/utils';

interface HyroDashboardTerminalProps {
  className?: string;
  compact?: boolean;
  model?: string;
  memoryLabel?: string;
  connectedCount?: number;
}

/**
 * Dashboard preview inside the standard blue HYRO terminal frame.
 */
export function HyroDashboardTerminal({
  className,
  compact = false,
  model = 'mimo-chat',
  memoryLabel = '2g 1f 0p',
  connectedCount = 6,
}: HyroDashboardTerminalProps) {
  const connectedKeys = new Set<string>(
    CONNECTED_SOURCES.filter((s) => s.connected).map((s) => s.key),
  );

  const commands: [string, string][] = [
    ['chat', 'Start AI conversation'],
    ['connect base', 'Base MCP · B20 · x402'],
    ['connect github', 'GitHub MCP tools'],
    ['memory', 'Goals, facts & policies'],
    ['setup base', 'Sepolia RPC on VPS'],
  ];

  return (
    <div className={cn(terminalFrameClass, className)}>
      <TerminalChrome title={`hyro — ${SITE.version} — dashboard`} />

      <div className={cn('px-4 py-4 font-mono sm:px-5', compact ? 'text-[11px]' : 'text-[12px]')}>
        <HyroAsciiLogo variant="inline" className="mb-3" />

        <div className="grid gap-6 border-b border-hyro-line/50 pb-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-hyro-blue">
              Status
            </p>
            <StatusRow label="LLM" value={model} accent />
            <StatusRow label="Memory" value={`${memoryLabel} · cloud`} />
            <StatusRow label="Governance" value="supervised" accent="cyan" />
            <StatusRow label="Sources" value={`${connectedCount}/8 connected`} accent />
          </div>
          <div className="space-y-1">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-hyro-blue">
              Commands
            </p>
            {commands.map(([cmd, hint]) => (
              <p key={cmd} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                <code className="shrink-0 text-hyro-blue">{cmd}</code>
                <span className="text-hyro-dim">{hint}</span>
              </p>
            ))}
          </div>
        </div>

        <p className="mb-3 mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-hyro-blue">
          Connected sources
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CONNECTED_SOURCES.map((s) => {
            const on = connectedKeys.has(s.key);
            return (
              <div
                key={s.key}
                className="flex min-h-[2rem] items-center gap-1.5 rounded-md border border-hyro-line/40 bg-hyro-panel/30 px-2 py-1.5"
              >
                <span className={on ? 'text-hyro-green' : 'text-hyro-faint'}>{on ? '●' : '○'}</span>
                <span className={cn('truncate text-[11px]', on ? 'text-hyro-ink' : 'text-hyro-dim')}>
                  {s.label}
                  {s.soon ? ' (soon)' : ''}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-1 border-t border-hyro-line/50 pt-3 text-[11px] text-hyro-dim">
          <p>
            <span className="text-hyro-green">MiMo · cloud ready</span>
            <span className="mx-2 text-hyro-faint">·</span>
            type <span className="text-hyro-blue">chat</span> to begin
          </p>
          <p>Base Sepolia · x402 USDC · Bankr-ready · memory synced to VPS</p>
        </div>

        <p className="mt-3">
          <span className="text-hyro-blue">hyro ❯ </span>
          <span className="inline-block h-[1em] w-[7px] animate-blink bg-hyro-blue" />
        </p>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean | 'cyan';
}) {
  const valueClass =
    accent === 'cyan' ? 'text-hyro-cyan' : accent ? 'text-hyro-blue' : 'text-hyro-ink';
  return (
    <p className="flex items-baseline justify-between gap-2 border-b border-hyro-line/20 py-1.5 last:border-0">
      <span className="text-hyro-dim">{label}</span>
      <span className={cn('truncate text-right font-medium', valueClass)}>{value}</span>
    </p>
  );
}
