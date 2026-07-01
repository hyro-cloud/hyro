import { NextResponse } from 'next/server';
import { filterListings, publishListing } from '@/lib/marketplace/store';
import type { PublishInput } from '@/lib/marketplace/types';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const listings = await filterListings({
    q: searchParams.get('q') ?? undefined,
    kind: searchParams.get('kind') ?? undefined,
    category: searchParams.get('category') ?? undefined,
  });
  return NextResponse.json({ listings }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PublishInput;
    const listing = await publishListing(body);
    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
