import { NextResponse } from 'next/server';
import { buyListing } from '@/lib/marketplace/store';

export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const out = await buyListing(slug);
    return NextResponse.json(out, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}
