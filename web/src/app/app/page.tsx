import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { WebConsole } from '@/components/app/web-console';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/content';

const title = 'Launch App — B20 Agent Console';
const description =
  'Run the HYRO B20 agent in your browser: an interactive console with the local runtime, memory, MCP and x402 payments on Base. Install the CLI for full MCP + cloud execution.';

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
          <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="live" className="mb-4">
                <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-hyro-blue" />
                B20 Agent Console · live
              </Badge>
              <h1 className="font-mono text-3xl font-semibold tracking-tight text-hyro-ink sm:text-4xl">
                Launch the <span className="text-hyro-blue term-glow">B20 agent</span>
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-hyro-mute">
                A real, in-browser console running the HYRO local runtime — type commands, run agents,
                search persistent memory, and execute x402 payments on Base. For full MCP + durable
                cloud execution, install the CLI.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" asChild>
                <Link href="/#cli">Install CLI</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Home
                </Link>
              </Button>
            </div>
          </div>

          <WebConsole />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
