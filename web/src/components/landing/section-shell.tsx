import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionShellProps {
  id?: string;
  label: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  bleed?: boolean;
}

export function SectionShell({
  id,
  label,
  title,
  description,
  children,
  className,
  bleed = false,
}: SectionShellProps) {
  return (
    <section id={id} className={cn('scroll-mt-24 py-16 sm:py-20', className)}>
      <div className={cn(!bleed && 'shell px-4 sm:px-6')}>
        <header className="mb-10 max-w-2xl">
          <p className="tag">
            <span className="n">{'//'}</span> {label}
          </p>
          <h2 className="mt-3 font-mono text-2xl font-semibold tracking-tight text-hyro-ink sm:text-3xl">
            {title}
          </h2>
          {description && (
            <p className="mt-4 text-base leading-relaxed text-hyro-mute">{description}</p>
          )}
        </header>
        {children}
      </div>
    </section>
  );
}
