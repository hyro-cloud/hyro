'use client';

import {
  Database,
  GitBranch,
  LayoutGrid,
  Plug,
  Server,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import { SectionShell } from '@/components/landing/section-shell';
import { Reveal } from '@/components/fx/reveal';
import { FEATURES, type IconKey } from '@/lib/content';

const ICONS: Record<IconKey, LucideIcon> = {
  Terminal,
  Server,
  Plug,
  Database,
  GitBranch,
  LayoutGrid,
};

export function FeaturesSection() {
  return (
    <SectionShell
      id="features"
      index="01"
      label="capabilities"
      title="Everything an agent needs to ship"
      description="From the terminal to durable cloud runs — HYRO is the full stack for autonomous software."
    >
      <div className="z-grid">
        {FEATURES.map((feature, i) => {
          const Icon = ICONS[feature.icon];
          return (
            <Reveal key={feature.idx} delay={(i % 3) * 70}>
              <article className="z-card z-card--lift h-full" data-tilt>
                <div className="z-card__top">
                  <span className="z-card__sigil">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="z-card__index">/{feature.idx}</span>
                </div>
                <h3 className="z-card__name">{feature.title}</h3>
                <p className="z-card__desc mt-3">{feature.desc}</p>
                <div className="z-card__line">
                  <span />
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}
