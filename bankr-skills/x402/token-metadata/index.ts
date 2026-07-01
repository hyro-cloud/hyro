// HYRO official skill · token-metadata · suggested price $0.001
// deps: cd into this folder and run `bun add viem`
import { createPublicClient, http, erc20Abi, formatUnits, isAddress } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

export default async function handler(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token || !isAddress(token)) {
    return new Response(JSON.stringify({ error: 'valid ?token= required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  const c = { address: token, abi: erc20Abi } as const;
  const [name, symbol, decimals, supply] = await Promise.all([
    client.readContract({ ...c, functionName: 'name' }),
    client.readContract({ ...c, functionName: 'symbol' }),
    client.readContract({ ...c, functionName: 'decimals' }),
    client.readContract({ ...c, functionName: 'totalSupply' }),
  ]);
  return {
    tool: 'token.meta',
    network: 'base',
    address: token,
    name,
    symbol,
    decimals,
    totalSupply: formatUnits(supply as bigint, decimals as number),
  };
}
