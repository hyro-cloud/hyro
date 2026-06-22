import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { SITE } from '@/lib/content';

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
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    'HYRO',
    'HYRO Cloud',
    'hyrocloud',
    'autonomous agents',
    'agent OS',
    'MCP',
    'CLI',
    'AI runtime',
    'pgvector',
    'agent memory',
  ],
  authors: [{ name: 'HYRO Cloud', url: SITE.url }],
  openGraph: {
    title: SITE.name,
    description: SITE.description,
    type: 'website',
    siteName: SITE.name,
    url: SITE.url,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.name,
    description: SITE.description,
    site: '@HyroCloud',
    creator: '@HyroCloud',
  },
  robots: { index: true, follow: true },
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
