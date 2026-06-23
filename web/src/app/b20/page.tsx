import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { BaseShowcase } from '@/components/base/base-showcase';
import { pageMetadata } from '@/lib/site-metadata';

const title = 'HYRO B20 — Base · x402 · Builder Codes';
const description =
  'B20 is HYRO’s live Base integration: agents pay over HTTP with x402 (USDC on Base) and tag onchain actions with Builder Codes (ERC-8021).';

export const metadata: Metadata = {
  ...pageMetadata({ title, description, path: '/b20', type: 'article' }),
  keywords: ['B20', 'Base', 'x402', 'Builder Codes', 'ERC-8021', 'USDC', 'agent payments', 'HYRO'],
};

export default function B20Page() {
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
