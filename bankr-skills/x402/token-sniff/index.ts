// HYRO official skill · token-sniff · suggested price $0.005
// No npm deps (uses fetch + DexScreener).
export default async function handler(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) {
    return new Response(JSON.stringify({ error: '?token= required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token}`);
  const data = (await res.json()) as { pairs?: any[] };
  const pairs = (data.pairs || []).filter((p) => p.chainId === 'base');
  const best = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
  if (!best) return { tool: 'token.sniff', token, found: false };
  const liq = best.liquidity?.usd || 0;
  return {
    tool: 'token.sniff',
    token,
    found: true,
    pair: `${best.baseToken?.symbol}/${best.quoteToken?.symbol}`,
    priceUsd: best.priceUsd,
    liquidityUsd: liq,
    volume24h: best.volume?.h24,
    dex: best.dexId,
    url: best.url,
    risk: liq < 10000 ? 'high' : liq < 50000 ? 'medium' : 'low',
  };
}
