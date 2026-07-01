// HYRO official skill · base-gas-oracle · suggested price $0.002
// deps: cd into this folder and run `bun add viem`
import { createPublicClient, http, formatGwei } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

export default async function handler() {
  const [gasPrice, block] = await Promise.all([client.getGasPrice(), client.getBlock()]);
  return {
    tool: 'base.gas',
    network: 'base',
    gasGwei: Number(formatGwei(gasPrice)),
    baseFeeGwei: block.baseFeePerGas ? Number(formatGwei(block.baseFeePerGas)) : null,
    block: Number(block.number),
    timestamp: new Date().toISOString(),
  };
}
