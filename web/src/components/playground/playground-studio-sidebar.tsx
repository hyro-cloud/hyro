'use client';

import Link from 'next/link';
import {
  Brain,
  LayoutGrid,
  MessageSquare,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Target,
  Wand2,
  Wallet,
  Grid3X3,
} from 'lucide-react';
import { SITE } from '@/lib/content';
import { usePlayground } from '@/lib/playground/store';
import type { PlaygroundView } from '@/lib/playground/types';
import { cn } from '@/lib/utils';

interface NavItem {
  id: PlaygroundView;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: 'Studio',
    items: [
      { id: 'playground', label: 'Chat', icon: <MessageSquare className="h-4 w-4" /> },
      { id: 'models', label: 'Models', icon: <Sparkles className="h-4 w-4" /> },
      { id: 'agents', label: 'Agents', icon: <LayoutGrid className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Data',
    items: [
      { id: 'memory', label: 'Memory', icon: <Brain className="h-4 w-4" /> },
      { id: 'goals', label: 'Goals', icon: <Target className="h-4 w-4" /> },
      { id: 'overview', label: 'Overview', icon: <Grid3X3 className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Governance',
    items: [
      { id: 'policies', label: 'Policies', icon: <Shield className="h-4 w-4" /> },
      { id: 'audit', label: 'Audit log', icon: <ScrollText className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Base',
    items: [
      { id: 'token-analyzer', label: 'Token analyzer', icon: <Wand2 className="h-4 w-4" /> },
      { id: 'wallet-watcher', label: 'Wallet watcher', icon: <Wallet className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Config',
    items: [{ id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> }],
  },
];

export function PlaygroundStudioSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { state, setView } = usePlayground();

  const go = (id: PlaygroundView) => {
    setView(id);
    onNavigate?.();
  };

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-hyro-line/20 bg-hyro-panel lg:w-[240px]">
      <div className="border-b border-hyro-line/20 px-4 py-4">
        <Link href="/" className="font-mono text-sm font-semibold text-hyro-ink">
          <span className="text-hyro-blue">HYRO</span>
          <span className="text-hyro-faint"> / </span>
          <span className="text-hyro-dim">Studio</span>
        </Link>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-hyro-faint">
          Agent playground · v{SITE.version}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Studio navigation">
        {NAV.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-2 px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-hyro-faint">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = state.view === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => go(item.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 font-mono text-[12px] transition',
                        active
                          ? 'bg-hyro-blue/15 font-medium text-hyro-blue'
                          : 'text-hyro-dim hover:bg-hyro-hover/10 hover:text-hyro-ink',
                      )}
                    >
                      <span className={active ? 'text-hyro-blue' : 'text-hyro-faint'}>{item.icon}</span>
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-hyro-line/20 px-4 py-3">
        <p className="font-mono text-[10px] text-hyro-faint">
          <span className="text-hyro-green">●</span> Local session
        </p>
        <Link href="/#mcp" className="mt-1 block font-mono text-[10px] text-hyro-blue hover:underline">
          MCP docs →
        </Link>
      </div>
    </aside>
  );
}

export function viewSectionLabel(view: PlaygroundView): string {
  for (const s of NAV) {
    const item = s.items.find((i) => i.id === view);
    if (item) return s.title;
  }
  return 'Studio';
}

export function viewTitle(view: PlaygroundView): string {
  for (const s of NAV) {
    const item = s.items.find((i) => i.id === view);
    if (item) return item.label;
  }
  return 'Chat';
}
