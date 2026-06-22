import { HYRO_ASCII_LINES } from '@/lib/hyro-ascii';
import { cn } from '@/lib/utils';

interface HyroAsciiLogoProps {
  className?: string;
  /** terminal = inside CLI window; inline = compact strip */
  variant?: 'terminal' | 'inline';
}

/**
 * Block ASCII “HYRO” — kept as real monospace art, rendered crisp (no font substitution).
 */
export function HyroAsciiLogo({ className, variant = 'terminal' }: HyroAsciiLogoProps) {
  return (
    <div className={cn('ascii-block-wrap', variant === 'terminal' && 'ascii-block-wrap--terminal')}>
      <pre
        className={cn(
          'ascii-block select-none text-hyro-blue',
          variant === 'terminal' ? 'ascii-block--terminal' : 'ascii-block--inline',
          className,
        )}
        aria-hidden
      >
        {HYRO_ASCII_LINES.join('\n')}
      </pre>
    </div>
  );
}

interface HyroAsciiBannerProps {
  version: string;
  className?: string;
}

/** Boot banner inside the animated CLI window. */
export function HyroAsciiBanner({ version, className }: HyroAsciiBannerProps) {
  return (
    <div className={cn('mb-4 select-none', className)}>
      <HyroAsciiLogo variant="terminal" />
      <p className="mt-3 font-mono text-[11px] text-hyro-dim">
        <span className="text-hyro-blue">HYRO TERMINAL</span>
        <span className="mx-2 text-hyro-faint">·</span>
        <span>v{version}</span>
      </p>
    </div>
  );
}
