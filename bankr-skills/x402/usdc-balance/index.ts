// HYRO official skill · usdc-balance · suggested price $0.001
// deps: cd into this folder and run `bun add viem`
import { createPublicClient, http, erc20Abi, formatEther, formatUnits, isAddress } from 'viem';
import { base } from 'viem/chains';

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
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
  const [eth, usdc] = await Promise.all([
    client.getBalance({ address }),
    client.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
  ]);
  return {
    tool: 'wallet.balance',
    network: 'base',
    address,
    eth: formatEther(eth),
    usdc: formatUnits(usdc as bigint, 6),
  };
}
