import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { HyroTokenPage } from '@/components/hyro/hyro-token-page';
import { HYRO_TOKEN } from '@/lib/hyro-token';
import { pageMetadata } from '@/lib/site-metadata';

const title = '$HYRO Token — Live on Base';
const description = `$HYRO community token on Base. Contract ${HYRO_TOKEN.address}. Live chart, market data, Uniswap & Bankr links.`;

export const metadata: Metadata = pageMetadata({
  title,
  description,
  path: '/hyro',
});

export default function HyroTokenRoutePage() {
  return (
    <>
      <SiteHeader />
      <HyroTokenPage />
      <SiteFooter />
    </>
  );
}
