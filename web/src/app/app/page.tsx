import type { Metadata } from 'next';
import { LaunchStudioCards, LaunchStudioHero } from '@/components/app/launch-studio';
import { WebConsole } from '@/components/app/web-console';
import { HyroDashboardTerminal } from '@/components/landing/hyro-dashboard-terminal';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SITE } from '@/lib/content';
import { pageMetadata } from '@/lib/site-metadata';

const title = 'Launch App — HYRO Agent Studio';
const description =
  'Launch HYRO: real dashboard TUI, Base MCP + B20, x402 USDC, Bankr-ready flows. Memory and MCP synced to your VPS brain.';

export const metadata: Metadata = pageMetadata({ title, description, path: '/app' });

export default function AppPage() {
  return (
    <>
      <SiteHeader />
      <main className="pt-28 sm:pt-36">
        <section className="mx-auto max-w-[1240px] px-5 pb-24 sm:px-8">
          <LaunchStudioHero />

          <div className="mb-14 mt-16">
            <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="z-section__eyebrow !mb-2">01 // dashboard</p>
                <h2 className="font-sans text-2xl font-bold tracking-tight text-hyro-ink sm:text-3xl">
                  HYRO terminal preview
                </h2>
              </div>
              <p className="max-w-md font-mono text-[11px] leading-relaxed text-hyro-dim">
                CONNECTED SOURCES reflect MCP installs on{' '}
                <span className="text-hyro-blue">{SITE.apiUrl}</span>
              </p>
            </header>
            <HyroDashboardTerminal />
          </div>

          <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="z-section__eyebrow !mb-2">02 // console</p>
              <h2 className="font-sans text-2xl font-bold tracking-tight text-hyro-ink sm:text-3xl">
                Web console
              </h2>
            </div>
            <p className="font-mono text-[11px] text-hyro-dim">
              Try commands locally · MCP demos · memory in browser
            </p>
          </header>
          <WebConsole />

          <LaunchStudioCards />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
