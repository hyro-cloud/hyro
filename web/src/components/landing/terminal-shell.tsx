import { cn } from '@/lib/utils';

/** Shared blue terminal chrome — matches site HYRO branding */
export const terminalFrameClass =
  'overflow-hidden rounded-xl border border-hyro-line/80 bg-[#040810] shadow-[0_0_0_1px_rgba(59,140,255,0.06),0_32px_64px_-24px_rgba(0,0,0,0.85),0_0_48px_-16px_rgba(59,140,255,0.18)]';

export function TerminalChrome({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 border-b border-hyro-line/70 bg-hyro-panel/80 px-4 py-2.5', className)}>
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/90" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/90" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/90" />
      </div>
      <div className="flex-1 truncate text-center font-mono text-[10px] tracking-wide text-hyro-dim">
        {title}
      </div>
      <div className="hidden w-[52px] sm:block" />
    </div>
  );
}

export function TerminalPrompt() {
  return <span className="text-hyro-blue">hyro ❯ </span>;
}
