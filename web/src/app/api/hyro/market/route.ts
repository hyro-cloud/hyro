import { NextResponse } from 'next/server';
import { fetchHyroMarketFromDexscreener } from '@/lib/hyro-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const market = await fetchHyroMarketFromDexscreener();
    return NextResponse.json({
      market,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, market: null }, { status: 502 });
  }
}
