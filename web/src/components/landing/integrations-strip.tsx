import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { INTEGRATIONS } from '@/lib/content';
import { cn } from '@/lib/utils';

interface IntegrationsStripProps {
  className?: string;
  /** Hide the small uppercase label (use when wrapped in SectionShell) */
  hideLabel?: boolean;
}

/** B20 · Base MCP · x402 · Bankr — label only */
export function IntegrationsStrip({ className, hideLabel }: IntegrationsStripProps) {
  return (
    <div className={className}>
      {!hideLabel && (
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-hyro-dim">
          Live integrations
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        {INTEGRATIONS.map((item) => {
          const inner = (
            <>
              <span className="font-semibold uppercase tracking-[0.12em] text-hyro-blue">
                {item.label}
              </span>
              {!item.internal && <ArrowUpRight className="h-3 w-3 shrink-0 opacity-60" />}
            </>
          );
          const cls = cn(
            'flex min-h-[2.5rem] w-full items-center justify-center gap-1.5 rounded-lg border border-hyro-line/80',
            'bg-hyro-panel/50 px-3 py-2 font-mono text-[11px] transition',
            'hover:border-hyro-blue/50 hover:bg-hyro-blue/[0.06]',
          );
          return item.internal ? (
            <Link key={item.id} href={item.href} className={cls}>
              {inner}
            </Link>
          ) : (
            <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
              {inner}
            </a>
          );
        })}
      </div>
    </div>
  );
}
