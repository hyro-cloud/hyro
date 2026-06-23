import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { SITE } from '@/lib/content';
import { SITE_LINK_PREVIEW } from '@/lib/site-metadata';

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE_LINK_PREVIEW.title,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.shareDescription,
  applicationName: SITE.name,
  keywords: [
    'HYRO',
    'HYRO Cloud',
    'hyrocloud',
    'autonomous agents',
    'agent OS',
    'agent operating system',
    'MCP',
    'Model Context Protocol',
    'hyro CLI',
    'terminal dashboard',
    'AI runtime',
    'pgvector',
    'agent memory',
    'Base MCP',
    'B20',
    'x402',
    'USDC',
    'Bankr',
    'DexScreener',
    'GitHub MCP',
    'MiMo',
    'VPS agent brain',
  ],
  authors: [{ name: 'HYRO Cloud', url: SITE.url }],
  creator: 'HYRO Cloud',
  publisher: 'HYRO Cloud',
  category: 'technology',
  icons: {
    icon: [{ url: '/logo.jpg', type: 'image/jpeg' }],
    apple: [{ url: '/logo.jpg', type: 'image/jpeg' }],
  },
  openGraph: SITE_LINK_PREVIEW.openGraph,
  twitter: SITE_LINK_PREVIEW.twitter,
  robots: { index: true, follow: true },
  alternates: { canonical: SITE.url },
};

export const viewport: Viewport = {
  themeColor: '#040810',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${sans.variable} ${mono.variable} min-h-screen bg-hyro-bg font-sans text-hyro-ink antialiased`}>
        {children}
      </body>
    </html>
  );
}
