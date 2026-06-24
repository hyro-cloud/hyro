import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { TokenStudio } from '@/components/token/token-studio';
import { pageMetadata } from '@/lib/site-metadata';

const title = 'Token Studio — Launch B20 on Base Sepolia';
const description =
  'HYRO Token Studio: create, deploy, and manage B20 tokens on Base Sepolia testnet via the B20 Factory precompile.';

export const metadata: Metadata = pageMetadata({
  title,
  description,
  path: '/token',
});

export default function TokenPage() {
  return (
    <>
      <SiteHeader />
      <TokenStudio />
      <SiteFooter />
    </>
  );
}
