import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { BaseShowcase } from '@/components/base/base-showcase';
import { SITE } from '@/lib/content';

const title = 'HYRO × Base — x402 payments & Builder Codes';
const description =
  'HYRO agents pay for tools, data and compute over HTTP with x402 — settled in USDC on Base — and tag every onchain action with Builder Codes (ERC-8021) for verifiable attribution and rewards.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/base' },
  keywords: ['Base', 'x402', 'Builder Codes', 'ERC-8021', 'USDC', 'agent payments', 'Coinbase', 'onchain attribution'],
  openGraph: {
    title,
    description,
    type: 'article',
    url: `${SITE.url}/base`,
    siteName: SITE.name,
  },
  twitter: { card: 'summary_large_image', title, description },
};

export default function BasePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <BaseShowcase />
      </main>
      <SiteFooter />
    </>
  );
}
