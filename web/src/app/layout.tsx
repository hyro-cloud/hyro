import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import './zapp.css';
import { SITE } from '@/lib/content';
import { SITE_LINK_PREVIEW } from '@/lib/site-metadata';
import { CustomCursor } from '@/components/fx/custom-cursor';
import { Tilt } from '@/components/fx/tilt';
import { ThemeProvider } from '@/components/theme/theme-provider';

const sans = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#040810' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('hyro.theme');if(t!=='dark'){document.documentElement.classList.add('light');document.documentElement.style.colorScheme='light';}else{document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){document.documentElement.classList.add('light');document.documentElement.style.colorScheme='light';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${sans.variable} ${mono.variable} min-h-screen bg-hyro-bg font-sans text-hyro-ink antialiased`}>
        <ThemeProvider>
          <CustomCursor />
          <Tilt />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
