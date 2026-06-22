import type { Metadata } from 'next';
import { LaunchStudioCards, LaunchStudioHero } from '@/components/app/launch-studio';
import { WebConsole } from '@/components/app/web-console';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SITE } from '@/lib/content';

const title = 'Launch App — HYRO Agent Studio';
const description =
  'Launch the HYRO agent in your browser: interactive console with memory, MCP, and B20/x402 on Base. Install the CLI from GitHub for full execution.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/app' },
  openGraph: { title, description, type: 'website', url: `${SITE.url}/app`, siteName: SITE.name },
  twitter: { card: 'summary_large_image', title, description },
};

export default function AppPage() {
  return (
    <>
      <SiteHeader />
      <main className="pt-24 sm:pt-28">
        <section className="shell px-4 pb-20 sm:px-6">
          <LaunchStudioHero />
          <WebConsole />
          <LaunchStudioCards />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
