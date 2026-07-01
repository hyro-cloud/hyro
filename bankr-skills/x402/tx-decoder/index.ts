// HYRO official skill · tx-decoder · suggested price $0.004
// deps: cd into this folder and run `bun add viem`
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

export default async function handler(req: Request) {
  const hash = new URL(req.url).searchParams.get('hash');
  if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    return new Response(JSON.stringify({ error: 'valid ?hash= required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  const tx = await client.getTransaction({ hash: hash as `0x${string}` });
  const receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` }).catch(() => null);
  return {
    tool: 'tx.decode',
    network: 'base',
    hash,
    from: tx.from,
    to: tx.to,
    valueEth: formatEther(tx.value),
    selector: tx.input.slice(0, 10),
    inputBytes: (tx.input.length - 2) / 2,
    status: receipt?.status ?? 'pending',
    block: tx.blockNumber ? Number(tx.blockNumber) : null,
    gasUsed: receipt ? Number(receipt.gasUsed) : null,
  };
}
