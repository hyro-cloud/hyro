// HYRO official skill · basename-resolver · suggested price $0.002
// deps: cd into this folder and run `bun add viem`
// Resolves ENS names (.eth) forward and reverse. For Base-native names (.base.eth)
// add the Base UniversalResolver to getEnsAddress/getEnsName (see README).
import { createPublicClient, http, isAddress } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETH_RPC_URL || 'https://eth.llamarpc.com'),
});

export default async function handler(req: Request) {
  const p = new URL(req.url).searchParams;
  const q = p.get('name') || p.get('address');
  if (!q) {
    return new Response(JSON.stringify({ error: '?name= or ?address= required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (isAddress(q)) {
    const name = await client.getEnsName({ address: q });
    return { tool: 'basename', query: q, address: q, name };
  }
  const address = await client.getEnsAddress({ name: normalize(q) });
  return { tool: 'basename', query: q, name: q, address };
}
