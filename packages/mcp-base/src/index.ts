#!/usr/bin/env node
/**
 * HYRO Base / B20 MCP server — stdio transport.
 * Docs: https://docs.base.org/get-started/launch-b20-token
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  formatUnits,
  http,
  parseEther,
  type Address,
  type Chain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

const B20_DOCS = 'https://docs.base.org/get-started/launch-b20-token';
const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
] as const;

function rpcUrl(): string {
  return process.env.BASE_RPC_URL?.trim() || 'https://mainnet.base.org';
}

function resolveChain(): Chain {
  const url = rpcUrl().toLowerCase();
  if (url.includes('sepolia')) return baseSepolia;
  return base;
}

function client() {
  return createPublicClient({ chain: resolveChain(), transport: http(rpcUrl()) });
}

const B20_LAUNCH_GUIDE = `B20 token launch on Base (summary from ${B20_DOCS}):

1. Install Base Foundry: base-foundryup (use base-forge / base-cast, not standard forge).
2. base-forge init && add base = true to foundry.toml.
3. Network: Base Sepolia RPC https://sepolia.base.org (chain 84532) or mainnet https://mainnet.base.org (8453).
4. Call B20 Factory precompile createB20(ASSET, salt, params, initCalls) via B20FactoryLib.
5. Factory addresses start with 0xB20f…; minted tokens start with 0xB200….
6. Mint with mint(address,uint256) after granting MINT_ROLE in initCalls.
7. B20 tokens are full ERC-20 — use get_token_balance for balances.

HYRO agent can read balances now; onchain deploy requires base-forge on a machine with a funded wallet.`;

const server = new Server(
  { name: 'hyro-mcp-base', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_chain_info',
      description: 'Base chain id, RPC URL, and whether a wallet key is configured.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_balance',
      description: 'Native ETH balance on Base for an address.',
      inputSchema: {
        type: 'object',
        properties: { address: { type: 'string', description: '0x address' } },
        required: ['address'],
      },
    },
    {
      name: 'get_token_balance',
      description:
        'ERC-20 / B20 token balance (B20 tokens are ERC-20 compatible at 0xB200… addresses).',
      inputSchema: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'Token contract address' },
          address: { type: 'string', description: 'Holder address' },
        },
        required: ['token', 'address'],
      },
    },
    {
      name: 'b20_launch_guide',
      description:
        'Step-by-step guide to launch a B20 token on Base via the B20 Factory precompile.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'send_transaction',
      description: 'Send native ETH on Base (requires WALLET_PRIVATE_KEY on the API host).',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          value: { type: 'string', description: 'Amount in ETH, e.g. 0.001' },
        },
        required: ['to', 'value'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const a = (args ?? {}) as Record<string, string>;

  try {
    if (name === 'get_chain_info') {
      const chain = resolveChain();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                chainId: chain.id,
                name: chain.name,
                rpcUrl: rpcUrl(),
                walletConfigured: Boolean(process.env.WALLET_PRIVATE_KEY?.trim()),
                b20Docs: B20_DOCS,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    if (name === 'get_balance') {
      const address = a.address as Address;
      const bal = await client().getBalance({ address });
      return {
        content: [{ type: 'text', text: `${formatEther(bal)} ETH` }],
      };
    }

    if (name === 'get_token_balance') {
      const token = a.token as Address;
      const holder = a.address as Address;
      const c = client();
      const [raw, decimals, symbol] = await Promise.all([
        c.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [holder] }),
        c.readContract({ address: token, abi: ERC20_ABI, functionName: 'decimals' }),
        c.readContract({ address: token, abi: ERC20_ABI, functionName: 'symbol' }),
      ]);
      return {
        content: [
          {
            type: 'text',
            text: `${formatUnits(raw, decimals)} ${symbol}`,
          },
        ],
      };
    }

    if (name === 'b20_launch_guide') {
      return { content: [{ type: 'text', text: B20_LAUNCH_GUIDE }] };
    }

    if (name === 'send_transaction') {
      const pk = process.env.WALLET_PRIVATE_KEY?.trim();
      if (!pk) {
        return {
          content: [
            {
              type: 'text',
              text: 'WALLET_PRIVATE_KEY is not set on the API host. Add it to .env.prod and restart the API container.',
            },
          ],
          isError: true,
        };
      }
      const account = privateKeyToAccount(pk.startsWith('0x') ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`));
      const wallet = createWalletClient({
        account,
        chain: resolveChain(),
        transport: http(rpcUrl()),
      });
      const hash = await wallet.sendTransaction({
        to: a.to as Address,
        value: parseEther(a.value),
      });
      return { content: [{ type: 'text', text: `tx: ${hash}` }] };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  } catch (err) {
    return {
      content: [{ type: 'text', text: (err as Error).message }],
      isError: true,
    };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
