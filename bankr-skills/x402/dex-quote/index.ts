// HYRO official skill · dex-quote · suggested price $0.006
// No npm deps (uses fetch + DexScreener).
export default async function handler(req: Request) {
  const p = new URL(req.url).searchParams;
  const token = p.get('token');
  const amount = Number(p.get('amount') || '1');
  if (!token) {
    return new Response(JSON.stringify({ error: '?token= required (&amount= optional)' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token}`);
  const data = (await res.json()) as { pairs?: any[] };
  const best = (data.pairs || [])
    .filter((x) => x.chainId === 'base')
    .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
  if (!best) return { tool: 'dex.quote', token, found: false };
  const price = Number(best.priceUsd);
  return {
    tool: 'dex.quote',
    token,
    pair: `${best.baseToken?.symbol}/${best.quoteToken?.symbol}`,
    amountIn: amount,
    priceUsd: price,
    valueUsd: Number((amount * price).toFixed(4)),
    dex: best.dexId,
    liquidityUsd: best.liquidity?.usd,
  };
}
