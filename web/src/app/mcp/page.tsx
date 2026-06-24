import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { McpQuickstartPage } from '@/components/integrations/mcp-quickstart';
import { pageMetadata } from '@/lib/site-metadata';

const title = 'Base MCP Quickstart — HYRO Cloud';
const description =
  'Connect official Base MCP (mcp.base.org) to HYRO: wallets, USDC, send, swap, x402, and partner plugins. Cursor, Claude, and hyro CLI setup.';

export const metadata: Metadata = pageMetadata({
  title,
  description,
  path: '/mcp',
});

export default function McpPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <McpQuickstartPage />
      </main>
      <SiteFooter />
    </>
  );
}
