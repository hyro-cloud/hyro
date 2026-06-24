'use client';

import { cn } from '@/lib/utils';

/** Shared studio surface — unified ZAPP panels, HYRO blue */
export const studioCard =
  'rounded-[10px] border border-hyro-line/20 bg-hyro-panel/30';

export const studioInput =
  'w-full rounded-lg border border-hyro-line/25 bg-hyro-bg/60 px-3 py-2.5 font-mono text-[13px] text-hyro-ink outline-none transition placeholder:text-hyro-faint focus:border-hyro-blue/50 focus:ring-1 focus:ring-hyro-blue/20';

export const studioLabel =
  'mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-hyro-dim';

export function StudioPageHeader({
  section,
  title,
  description,
}: {
  section: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-6 border-b border-hyro-line/20 pb-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-hyro-blue">
        {section}
      </p>
      <h1 className="mt-2 font-sans text-2xl font-bold tracking-tight text-hyro-ink sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-hyro-mute">{description}</p>
      )}
    </header>
  );
}

export function StudioField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-0', className)}>
      <label className={studioLabel}>{label}</label>
      {children}
    </div>
  );
}

export function StudioPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(studioCard, 'p-4 sm:p-5', className)}>{children}</div>
  );
}
