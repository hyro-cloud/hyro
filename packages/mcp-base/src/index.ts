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

const B20_LAUNCH_GUIDE = `B20 token launch on Base (summary from ${B20_DOCS}):

1. Install Base Foundry: base-foundryup (use base-forge / base-cast, not standard forge).
2. base-forge init && add base = true to foundry.toml.
3. Network: Base Sepolia RPC https://sepolia.base.org (chain 84532) or mainnet https://mainnet.base.org (8453).
4. Call B20 Factory precompile createB20(ASSET, salt, params, initCalls) via B20FactoryLib.
5. Factory addresses start with 0xB20f…; minted tokens start with 0xB200….
6. Mint with mint(address,uint256) after granting MINT_ROLE in initCalls.
7. B20 tokens are full ERC-20 — use get_token_balance for balances.

HYRO agent can read balances now; onchain deploy requires base-forge on a machine with a funded wallet.`;

const USDC_BY_CHAIN: Record<number, Address> = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  84532: '0x036CbD53842c5426634e7929541c8C8aF941b5',
};

const BASE_MCP_QUICKSTART = `Connect official Base MCP: https://mcp.base.org
Docs: https://docs.base.org/agents/quickstart
Skill: npx skills add base/skills --skill base-mcp -a cursor`;

const BANKR_X402_GUIDE = `Bankr x402 Cloud: https://bankr.bot/x402
  bankr x402 init → edit handler → bankr x402 deploy → bankr x402 call`;

const X402_FLOW_GUIDE = `x402 HTTP 402 USDC payments on Base. See https://docs.cdp.coinbase.com/x402/core-concepts/how-it-works`;

const X402_MCP_GUIDE = `Monetize MCP tools with @x402/mcp createPaymentWrapper — npm @x402/mcp`;

function client() {
  return createPublicClient({ chain: resolveChain(), transport: http(rpcUrl()) });
}

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
      name: 'get_usdc_balance',
      description: 'USDC balance on Base for an address (Circle USDC).',
      inputSchema: {
        type: 'object',
        properties: { address: { type: 'string', description: '0x address' } },
        required: ['address'],
      },
    },
    {
      name: 'base_mcp_quickstart',
      description: 'How to connect official Base MCP (mcp.base.org) and base-mcp skill.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'bankr_x402_guide',
      description: 'Bankr x402 Cloud — deploy paid USDC-gated HTTP endpoints on Base.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'x402_flow_guide',
      description: 'x402 payment flow overview for HYRO agents on Base.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'x402_mcp_guide',
      description: 'Monetize MCP tools with @x402/mcp payment wrapper.',
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

    if (name === 'get_usdc_balance') {
      const holder = a.address as Address;
      const chain = resolveChain();
      const usdc = USDC_BY_CHAIN[chain.id];
      if (!usdc) {
        return { content: [{ type: 'text', text: `USDC not configured for chain ${chain.id}` }], isError: true };
      }
      const raw = await client().readContract({
        address: usdc,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [holder],
      });
      return { content: [{ type: 'text', text: `${formatUnits(raw, 6)} USDC` }] };
    }

    if (name === 'base_mcp_quickstart') {
      return { content: [{ type: 'text', text: BASE_MCP_QUICKSTART }] };
    }
    if (name === 'bankr_x402_guide') {
      return { content: [{ type: 'text', text: BANKR_X402_GUIDE }] };
    }
    if (name === 'x402_flow_guide') {
      return { content: [{ type: 'text', text: X402_FLOW_GUIDE }] };
    }
    if (name === 'x402_mcp_guide') {
      return { content: [{ type: 'text', text: X402_MCP_GUIDE }] };
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
      if (!a.to || !a.value) {
        return { content: [{ type: 'text', text: 'to and value are required' }], isError: true };
      }
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
