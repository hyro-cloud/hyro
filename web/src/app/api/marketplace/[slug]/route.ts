import { NextResponse } from 'next/server';
import { getListing } from '@/lib/marketplace/store';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ listing }, { headers: { 'cache-control': 'no-store' } });
}
