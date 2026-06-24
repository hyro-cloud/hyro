import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { X402Showcase } from '@/components/integrations/x402-showcase';
import { pageMetadata } from '@/lib/site-metadata';

const title = 'x402 & Bankr — Agent USDC Payments on Base';
const description =
  'HYRO x402 integration: HTTP 402 USDC payments on Base, Bankr x402 Cloud deploy, and @x402/mcp for paid MCP tools.';

export const metadata: Metadata = pageMetadata({
  title,
  description,
  path: '/x402',
});

export default function X402Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <X402Showcase />
      </main>
      <SiteFooter />
    </>
  );
}
