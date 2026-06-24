/**
 * HYRO onchain skills — local MCP tools + Base MCP / x402 / Bankr quickstart prompts.
 * Local tools: packages/mcp-base + dexscreener (playground API route).
 * Official wallet/send/swap: connect https://mcp.base.org (see base-mcp-connect skill).
 */

export type SkillCategory =
  | 'quickstart'
  | 'transfers'
  | 'data'
  | 'base'
  | 'b20'
  | 'dex'
  | 'x402'
  | 'bankr';

export interface BaseMcpSkill {
  id: string;
  title: string;
  description: string;
  category: SkillCategory;
  /** MCP server slug on HYRO playground tool route */
  server: 'base' | 'dexscreener';
  /** Tool name(s) invoked — empty = chat-only (MiMo / Base MCP official) */
  tools: string[];
  toolLabel: string;
  chatInsert: string;
  defaultArgs?: Record<string, string>;
  /** If true, skill only fills chat — no local tool call */
  chatOnly?: boolean;
}

export const BASE_MCP_SKILL_CATEGORIES: { id: SkillCategory; label: string }[] = [
  { id: 'quickstart', label: 'Base MCP' },
  { id: 'x402', label: 'x402' },
  { id: 'bankr', label: 'Bankr' },
  { id: 'dex', label: 'DexScreener' },
  { id: 'base', label: 'Base reads' },
  { id: 'b20', label: 'B20' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'data', label: 'Chain data' },
];

export const BASE_MCP_SKILLS: BaseMcpSkill[] = [
  // —— Official Base MCP quickstart (docs.base.org/agents/quickstart) ——
  {
    id: 'qs-connect',
    title: 'Connect Base MCP',
    description: 'Install mcp.base.org + base-mcp skill in Cursor, Claude, or HYRO CLI.',
    category: 'quickstart',
    server: 'base',
    tools: ['base_mcp_quickstart'],
    toolLabel: 'base_mcp_quickstart',
    chatInsert: 'Walk me through connecting Base MCP (mcp.base.org) to HYRO and Cursor.',
    defaultArgs: {},
  },
  {
    id: 'qs-wallets',
    title: 'Show my wallets',
    description: 'List Base Account wallets — requires official Base MCP (OAuth).',
    category: 'quickstart',
    server: 'base',
    tools: [],
    toolLabel: 'base_mcp · wallets',
    chatInsert: 'Show me my wallets',
    chatOnly: true,
  },
  {
    id: 'qs-usdc',
    title: 'USDC balance',
    description: 'USDC balance on Base for any address (local RPC read).',
    category: 'quickstart',
    server: 'base',
    tools: ['get_usdc_balance'],
    toolLabel: 'base_usdc_balance',
    chatInsert: "What's my USDC balance on Base? Address: 0x",
    defaultArgs: { address: '' },
  },
  {
    id: 'qs-send-usdc',
    title: 'Send USDC',
    description: 'Send USDC via Base MCP — approval link in Base Account.',
    category: 'quickstart',
    server: 'base',
    tools: [],
    toolLabel: 'base_mcp · send',
    chatInsert: 'Send 1 USDC to jesse.base.eth',
    chatOnly: true,
  },
  {
    id: 'qs-yield',
    title: 'USDC yield',
    description: 'Find best USDC yield on Base — Morpho plugin via Base MCP.',
    category: 'quickstart',
    server: 'base',
    tools: [],
    toolLabel: 'base_mcp · morpho',
    chatInsert:
      'Find the highest paying USDC yield on Base by APY and deposit 100 USDC',
    chatOnly: true,
  },

  // —— x402 + Bankr ——
  {
    id: 'x402-overview',
    title: 'x402 flow',
    description: 'HTTP 402 USDC payments on Base — how HYRO agents pay per call.',
    category: 'x402',
    server: 'base',
    tools: ['x402_flow_guide'],
    toolLabel: 'x402_flow_guide',
    chatInsert: 'Explain the x402 payment flow for HYRO agents on Base.',
    defaultArgs: {},
  },
  {
    id: 'bankr-x402',
    title: 'Bankr x402 Cloud',
    description: 'Deploy paid API endpoints with bankr x402 init / deploy.',
    category: 'bankr',
    server: 'base',
    tools: ['bankr_x402_guide'],
    toolLabel: 'bankr_x402_guide',
    chatInsert: 'How do I deploy a paid x402 API with Bankr x402 Cloud?',
    defaultArgs: {},
  },
  {
    id: 'x402-mcp',
    title: 'x402 + MCP',
    description: 'Monetize MCP tools with @x402/mcp payment wrapper on VPS.',
    category: 'x402',
    server: 'base',
    tools: ['x402_mcp_guide'],
    toolLabel: 'x402_mcp_guide',
    chatInsert: 'How do I add x402 payments to HYRO MCP tools with @x402/mcp?',
    defaultArgs: {},
  },

  // —— DexScreener ——
  {
    id: 'dex-search',
    title: 'Token search',
    description: 'Search any Base token by name, symbol, or address.',
    category: 'dex',
    server: 'dexscreener',
    tools: ['search_pairs'],
    toolLabel: 'dexscreener_search',
    chatInsert: 'Search Base token "BRETT" on DexScreener and summarize liquidity.',
    defaultArgs: { query: 'BRETT base' },
  },
  {
    id: 'dex-pair',
    title: 'Market data',
    description: 'Full market data for a DexScreener pair or token.',
    category: 'dex',
    server: 'dexscreener',
    tools: ['get_pair'],
    toolLabel: 'dexscreener_token',
    chatInsert: 'Get DexScreener market data for pair id on Base.',
    defaultArgs: { pairId: 'base' },
  },

  // —— Base reads ——
  {
    id: 'base-balance',
    title: 'Wallet balance',
    description: 'Check ETH balance of any wallet on Base.',
    category: 'base',
    server: 'base',
    tools: ['get_balance'],
    toolLabel: 'base_get_eth_balance',
    chatInsert: 'Check ETH balance on Base for address: 0x',
    defaultArgs: { address: '' },
  },
  {
    id: 'base-token',
    title: 'Token balance',
    description: 'ERC-20 / B20 token balance for a holder.',
    category: 'b20',
    server: 'base',
    tools: ['get_token_balance'],
    toolLabel: 'base_erc20_balance',
    chatInsert: 'Get B20/ERC-20 token balance on Base (token + holder address).',
    defaultArgs: { token: '', address: '' },
  },
  {
    id: 'base-chain',
    title: 'Chain info',
    description: 'Base chain id, RPC URL, wallet configured on VPS.',
    category: 'data',
    server: 'base',
    tools: ['get_chain_info'],
    toolLabel: 'base_chain_info',
    chatInsert: 'Show Base chain info from HYRO MCP (RPC, chain id, wallet).',
    defaultArgs: {},
  },
  {
    id: 'b20-guide',
    title: 'B20 launch guide',
    description: 'Step-by-step B20 token launch via Base Factory precompile.',
    category: 'b20',
    server: 'base',
    tools: ['b20_launch_guide'],
    toolLabel: 'b20_launch_guide',
    chatInsert: 'Show the B20 token launch guide for Base Sepolia.',
    defaultArgs: {},
  },
  {
    id: 'base-send',
    title: 'Prepare transfer',
    description: 'Prepare native ETH send — you approve every tx before execution.',
    category: 'transfers',
    server: 'base',
    tools: ['send_transaction'],
    toolLabel: 'base_prepare_send',
    chatInsert: 'Prepare sending 0.001 ETH on Base to address: 0x (requires VPS wallet + approval).',
    defaultArgs: { to: '', value: '0.001' },
  },
];

export function skillById(id: string): BaseMcpSkill | undefined {
  return BASE_MCP_SKILLS.find((s) => s.id === id);
}

export function skillChatPrefix(skillId: string): string {
  return `[skill:${skillId}] `;
}
