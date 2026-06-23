import type { Metadata } from 'next';
import { SITE } from '@/lib/content';

const ogTitle = `${SITE.name} — ${SITE.tagline}`;

export const DEFAULT_OG_IMAGE = {
  url: SITE.ogImage,
  width: 1024,
  height: 1024,
  alt: `${SITE.name} logo`,
} as const;

/** Shared Open Graph + Twitter fields for link previews (English). */
export const SITE_LINK_PREVIEW = {
  title: ogTitle,
  description: SITE.shareDescription,
  openGraph: {
    title: ogTitle,
    description: SITE.shareDescription,
    type: 'website' as const,
    siteName: SITE.name,
    url: SITE.url,
    locale: 'en_US',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: ogTitle,
    description: SITE.shareDescription,
    site: '@HyroCloud',
    creator: '@HyroCloud',
    images: [SITE.ogImage],
  },
};

export function pageMetadata({
  title,
  description,
  path,
  type = 'website',
}: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type,
      url: `${SITE.url}${path}`,
      siteName: SITE.name,
      locale: 'en_US',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [SITE.ogImage],
    },
  };
}
