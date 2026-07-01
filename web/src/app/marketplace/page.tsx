import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { MarketplaceApp } from '@/components/marketplace/marketplace-app';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Marketplace — Paid Agent Skills & Memory on Base',
  description:
    'Buy and sell agent skills and memory packs, settled in USDC on Base via Bankr x402 Cloud. Agents pay per call, tagged with a Builder Code.',
  path: '/marketplace',
});

export default function MarketplacePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <MarketplaceApp />
      </main>
      <SiteFooter />
    </>
  );
}
