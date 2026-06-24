'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';
import { SiteHeader } from '@/components/layout/site-header';
import { PlaygroundChatView } from '@/components/playground/playground-chat';
import {
  PlaygroundStudioSidebar,
  viewSectionLabel,
  viewTitle,
} from '@/components/playground/playground-studio-sidebar';
import { StudioPageHeader } from '@/components/playground/studio-primitives';
import {
  PlaygroundAgentsView,
  PlaygroundAuditView,
  PlaygroundGoalsView,
  PlaygroundMemoryHubView,
  PlaygroundMemoryView,
  PlaygroundModelsView,
  PlaygroundOverview,
  PlaygroundPoliciesView,
  PlaygroundSettingsView,
  PlaygroundTokenAnalyzer,
  PlaygroundWalletWatcher,
} from '@/components/playground/playground-views';
import { PlaygroundProvider, usePlayground } from '@/lib/playground/store';
import type { PlaygroundView } from '@/lib/playground/types';

const VIEW_DESCRIPTIONS: Partial<Record<PlaygroundView, string>> = {
  playground:
    'Chat with MiMo on your HYRO VPS — live Base MCP skills, real DexScreener + onchain reads.',
  models: '19 frontier models — MiMo default on api.hyrocloud.lol.',
  memory: 'HYRO memory — facts, goals, preferences synced to VPS when logged in.',
  goals: 'Governance goals — tracked locally and via hyro memory on VPS.',
  policies: 'HYRO policy rules — supervised sends, builder codes, MCP deny-by-default.',
  audit: 'Playground actions logged locally — newest first.',
  agents: 'HYRO agent personas — onchain, market intel, research, builder.',
  settings: 'Gateway label, builder code, and playground data.',
  'token-analyzer': 'Base token search via DexScreener — live market data.',
  'wallet-watcher': 'Wallet balance on Base — live RPC via HYRO MCP.',
  overview: 'Session stats and HYRO platform status.',
};

function PlaygroundMain() {
  const { state } = usePlayground();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const view = state.view;

  const views: Record<PlaygroundView, React.ReactNode> = {
    overview: <PlaygroundOverview />,
    memory: <PlaygroundMemoryView />,
    goals: <PlaygroundGoalsView />,
    policies: <PlaygroundPoliciesView />,
    audit: <PlaygroundAuditView />,
    agents: <PlaygroundAgentsView />,
    'memory-hub': <PlaygroundMemoryHubView />,
    models: <PlaygroundModelsView />,
    playground: <PlaygroundChatView />,
    settings: <PlaygroundSettingsView />,
    'token-analyzer': <PlaygroundTokenAnalyzer />,
    'wallet-watcher': <PlaygroundWalletWatcher />,
  };

  const isChat = view === 'playground';

  return (
    <div className="flex min-h-[100dvh] flex-col bg-hyro-bg">
      <SiteHeader />

      <div className="relative flex min-h-0 flex-1 pt-16">
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          />
        )}

        <div
          className={`fixed inset-y-0 left-0 z-50 pt-16 transition-transform lg:static lg:z-0 lg:translate-x-0 lg:pt-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <PlaygroundStudioSidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-hyro-line/70 text-hyro-mute"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="font-mono text-[12px] text-hyro-dim">{viewTitle(view)}</span>
          </div>

          {!isChat && (
            <StudioPageHeader
              section={viewSectionLabel(view)}
              title={viewTitle(view)}
              description={VIEW_DESCRIPTIONS[view]}
            />
          )}

          {isChat ? (
            <div>
              <StudioPageHeader
                section="Studio"
                title="Chat with MiMo"
                description={VIEW_DESCRIPTIONS.playground}
              />
              {views.playground}
            </div>
          ) : (
            views[view]
          )}
        </main>
      </div>
    </div>
  );
}

export function PlaygroundApp() {
  return (
    <PlaygroundProvider>
      <PlaygroundMain />
    </PlaygroundProvider>
  );
}
