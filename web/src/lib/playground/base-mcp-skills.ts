/**
 * Base MCP onchain skills — HYRO packages (base + dexscreener).
 * UI inspired by Base MCP agent studio; tools match VPS MCP registry.
 */

export type SkillCategory =
  | 'transfers'
  | 'data'
  | 'base'
  | 'b20'
  | 'dex';

export interface BaseMcpSkill {
  id: string;
  title: string;
  description: string;
  category: SkillCategory;
  /** MCP server slug on HYRO VPS */
  server: 'base' | 'dexscreener';
  /** Tool name(s) invoked */
  tools: string[];
  /** Shown in UI chip */
  toolLabel: string;
  /** Inserted into chat when user clicks the skill */
  chatInsert: string;
  /** Optional default args for tool route */
  defaultArgs?: Record<string, string>;
}

export const BASE_MCP_SKILL_CATEGORIES: { id: SkillCategory; label: string }[] = [
  { id: 'dex', label: 'DexScreener' },
  { id: 'base', label: 'Base reads' },
  { id: 'b20', label: 'B20' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'data', label: 'Chain data' },
];

/** Skills that map to real HYRO MCP tools (packages/mcp-base + dexscreener registry) */
export const BASE_MCP_SKILLS: BaseMcpSkill[] = [
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
