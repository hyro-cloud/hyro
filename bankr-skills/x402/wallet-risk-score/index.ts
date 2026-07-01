// HYRO official skill · wallet-risk-score · suggested price $0.01
// deps: cd into this folder and run `bun add viem`
// Heuristic risk score from live onchain signals (age, activity, balance, code).
import { createPublicClient, http, formatEther, isAddress } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

export default async function handler(req: Request) {
  const address = new URL(req.url).searchParams.get('address');
  if (!address || !isAddress(address)) {
    return new Response(JSON.stringify({ error: 'valid ?address= required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  const [balance, txCount, code] = await Promise.all([
    client.getBalance({ address }),
    client.getTransactionCount({ address }),
    client.getCode({ address }).catch(() => undefined),
  ]);
  const isContract = !!code && code !== '0x';

  let score = 50;
  if (txCount === 0) score += 30;
  else if (txCount < 5) score += 15;
  else if (txCount > 100) score -= 15;
  if (Number(formatEther(balance)) < 0.0005) score += 10;
  if (isContract) score -= 10;
  score = Math.max(0, Math.min(100, score));

  return {
    tool: 'wallet.risk',
    network: 'base',
    address,
    score,
    tier: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
    signals: { txCount, isContract, balanceEth: formatEther(balance) },
  };
}
