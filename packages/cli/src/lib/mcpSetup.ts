/**
 * VPS + local setup for MCP sources, x402, Bankr, and official Base MCP.
 */
import {
  BANKR_X402_GUIDE,
  BASE_MCP_QUICKSTART_GUIDE,
  BASE_MCP_URL,
  X402_FLOW_GUIDE,
} from '@hyro/core';

export const VPS_MCP_SETUP: Record<string, { env: string[]; steps: string[] }> = {
  github: {
    env: ['GITHUB_TOKEN'],
    steps: [
      '1. GitHub → Settings → Developer settings → Personal access tokens',
      '2. VPS: nano ~/hyro/.env.prod → GITHUB_TOKEN=ghp_...',
      '3. VPS: docker compose --env-file .env.prod -f docker-compose.api.yml up -d --force-recreate api',
      '4. PC: hyro connect github',
    ],
  },
  base: {
    env: ['BASE_RPC_URL', 'WALLET_PRIVATE_KEY (optional)'],
    steps: [
      '1. VPS: nano ~/hyro/.env.prod',
      '2. BASE_RPC_URL=https://mainnet.base.org  (testnet: https://sepolia.base.org)',
      '3. Optional WALLET_PRIVATE_KEY=0x... for agent send_transaction',
      '4. VPS: docker compose --env-file .env.prod -f docker-compose.api.yml up -d --force-recreate api',
      '5. PC: hyro login && hyro connect base',
      '6. Local reads (no VPS): hyro mcp call base get_usdc_balance address=0x...',
      '7. Agent: hyro run "check ETH balance for 0x..."',
    ],
  },
  'base-official': {
    env: [],
    steps: [
      '1. PC: hyro login',
      '2. PC: hyro connect base-official  (opens Base Account OAuth in browser)',
      '3. PC: hyro mcp grant base-official',
      '4. PC: hyro run "show my wallets"  or  hyro chat',
      '5. Writes return an approvalUrl — open in Base Account to confirm send/swap',
      '6. Cursor fallback: ~/.cursor/mcp.json → "base-mcp": { "url": "https://mcp.base.org" }',
    ],
  },
  x402: {
    env: ['X402_PAY_TO_WALLET', 'X402_FACILITATOR_URL (optional)'],
    steps: [
      '1. Read flow: hyro mcp call base x402_flow_guide',
      '2. Bankr x402 Cloud: https://bankr.bot/x402 → bankr x402 init && bankr x402 deploy',
      '3. VPS monetize MCP: npm @x402/mcp createPaymentWrapper on packages/mcp-base',
      '4. Optional .env.prod: X402_PAY_TO_WALLET=0x...',
    ],
  },
  bankr: {
    env: ['BANKR_API_KEY (optional)'],
    steps: [
      '1. hyro mcp call base bankr_x402_guide',
      '2. Install Bankr CLI from https://bankr.bot/x402',
      '3. bankr x402 init → edit handler → bankr x402 deploy',
      '4. Base MCP Bankr plugin (token launches): connect mcp.base.org in Cursor',
    ],
  },
};

const GUIDE_TEXT: Record<string, string> = {
  'base-mcp': BASE_MCP_QUICKSTART_GUIDE,
  x402: X402_FLOW_GUIDE + '\n\n' + BANKR_X402_GUIDE,
  bankr: BANKR_X402_GUIDE,
};

export function printVpsSetup(key: string): string {
  const guide = VPS_MCP_SETUP[key];
  if (!guide) return `No VPS setup guide for: ${key}`;
  return [
    '',
    `Setup ${key}:`,
    ...guide.steps,
    '',
    `Env (.env.prod or local): ${guide.env.join(', ')}`,
    '',
  ].join('\n');
}

export function printIntegrationGuide(key: string): void {
  const vps = VPS_MCP_SETUP[key];
  if (vps) {
    console.log(printVpsSetup(key));
    return;
  }
  const text = GUIDE_TEXT[key];
  if (text) {
    console.log('\n' + text + '\n');
    return;
  }
  console.log(`Unknown guide: ${key}. Try: base, base-mcp, x402, bankr, github`);
}
