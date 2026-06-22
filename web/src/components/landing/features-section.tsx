'use client';

import { motion } from 'framer-motion';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FEATURES, type IconKey } from '@/lib/content';

const ICONS: Record<IconKey, LucideIcon> = {
  Terminal,
  Server,
  Plug,
  Database,
  GitBranch,
  LayoutGrid,
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export function FeaturesSection() {
  return (
    <SectionShell
      id="features"
      label="features"
      title="Everything an agent needs to ship"
      description="From the terminal to durable cloud runs — HYRO is the full stack for autonomous software."
    >
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
      >
        {FEATURES.map((feature) => {
          const Icon = ICONS[feature.icon];
          return (
            <motion.div key={feature.idx} variants={item}>
              <Card className="group h-full transition hover:border-hyro-blue/40 hover:bg-hyro-panel">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-xs text-hyro-faint">{feature.idx}</span>
                    <Icon className="h-4 w-4 text-hyro-blue transition group-hover:scale-110" />
                  </div>
                  <CardTitle className="normal-case tracking-normal text-hyro-ink">
                    {feature.title}
                  </CardTitle>
                  <CardDescription>{feature.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-px w-full bg-gradient-to-r from-hyro-blue/30 to-transparent" />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </SectionShell>
  );
}
