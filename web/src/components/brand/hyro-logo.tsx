import { cn } from '@/lib/utils';

interface HyroLogoProps {
  className?: string;
  variant?: 'compact' | 'hero' | 'terminal';
}

const sizeMap = {
  compact: { fontSize: 15, height: 20 },
  hero: { fontSize: 36, height: 44 },
  terminal: { fontSize: 22, height: 28 },
};

/** Crisp SVG wordmark — sharp at any size, no blocky ASCII. */
export function HyroWordmark({ className, variant = 'compact' }: HyroLogoProps) {
  const { fontSize, height } = sizeMap[variant];

  return (
    <svg
      viewBox={`0 0 ${fontSize * 4.2} ${height}`}
      height={height}
      className={cn('w-auto', className)}
      aria-label="HYRO"
      role="img"
    >
      <text
        x="0"
        y={fontSize * 0.92}
        fill="currentColor"
        fontFamily="var(--font-mono), ui-monospace, monospace"
        fontSize={fontSize}
        fontWeight="600"
        letterSpacing="0.14em"
      >
        HYRO
      </text>
    </svg>
  );
}

export function HyroBrandLockup({
  showDomain = false,
  className,
}: {
  showDomain?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <HyroWordmark variant="compact" className="text-hyro-blue term-glow" />
      {showDomain && (
        <>
          <span className="font-mono text-[11px] text-hyro-faint/70">/</span>
          <span className="font-mono text-[11px] text-hyro-dim">hyrocloud.lol</span>
        </>
      )}
    </span>
  );
}

export function HyroTerminalBanner({ version }: { version: string }) {
  return (
    <div className="mb-4 select-none">
      <div className="inline-flex flex-col gap-2.5 rounded-lg border border-hyro-line/50 bg-gradient-to-br from-hyro-blue/[0.06] to-transparent px-4 py-3">
        <HyroWordmark variant="terminal" className="text-hyro-blue term-glow" />
        <div className="h-px w-16 bg-gradient-to-r from-hyro-blue/60 to-transparent" />
        <p className="font-mono text-[10px] tracking-widest text-hyro-dim uppercase">
          terminal · v{version}
        </p>
      </div>
    </div>
  );
}
