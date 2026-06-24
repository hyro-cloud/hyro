import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/fx/reveal';

interface SectionShellProps {
  id?: string;
  label: string;
  /** ZAPP-style section number, e.g. "01". Rendered before the label. */
  index?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Center the section head (ZAPP default). Set false for left-aligned. */
  center?: boolean;
  bleed?: boolean;
}

export function SectionShell({
  id,
  label,
  index,
  title,
  description,
  children,
  className,
  center = true,
  bleed = false,
}: SectionShellProps) {
  return (
    <section id={id} className={className}>
      <div className={cn('z-section', center && 'z-section--center', bleed && 'max-w-none')}>
        <Reveal as="header" className="z-section__head">
          <p className="z-section__eyebrow">
            {index ? `${index} // ${label}` : `// ${label}`}
          </p>
          <h2 className="z-section__title">{title}</h2>
          {description && <p className="z-section__sub">{description}</p>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}
