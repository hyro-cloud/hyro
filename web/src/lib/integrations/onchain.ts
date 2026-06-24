/** Shared onchain integration constants — Base MCP, x402, Bankr. */

export const BASE_MCP_URL = 'https://mcp.base.org';

export const INTEGRATION_URLS = {
  baseMcpQuickstart: 'https://docs.base.org/agents/quickstart',
  baseMcpSkill: 'https://docs.base.org/agents/skills/SKILL.md',
  bankrX402: 'https://bankr.bot/x402',
  bankrX402Docs: 'https://docs.bankr.bot/x402-cloud/quick-start',
  bankrHome: 'https://bankr.bot',
  x402Docs: 'https://docs.cdp.coinbase.com/x402/core-concepts/how-it-works',
  x402McpNpm: 'https://www.npmjs.com/package/@x402/mcp',
} as const;

/** Circle USDC on Base */
export const USDC_BY_CHAIN: Record<number, `0x${string}`> = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  84532: '0x036CbD53842c5426634e7929541c8C8aF941b5',
};

export const BASE_MCP_QUICKSTART_GUIDE = `Base MCP quickstart (HYRO + official Base Account)

1. Connect the MCP server
   • Cursor: add to .cursor/mcp.json → { "base-mcp": { "url": "${BASE_MCP_URL}" } }
   • Claude / ChatGPT: Custom connector URL ${BASE_MCP_URL} (OAuth → Base Account)
   • Claude Code: claude mcp add --transport http base-mcp ${BASE_MCP_URL}
   • HYRO VPS: hyro mcp install base-official (see docs/MCP.md)

2. Install the base-mcp skill
   npx skills add base/skills --skill base-mcp -a cursor

3. Try these prompts (official Base MCP tools — wallet approval required for writes):
   • "Show me my wallets"
   • "What's my USDC balance on Base?"
   • "Send 1 USDC to jesse.base.eth"
   • "Find the highest paying USDC yield on Base by APY and deposit 100 USDC"

Docs: ${INTEGRATION_URLS.baseMcpQuickstart}
Skill: ${INTEGRATION_URLS.baseMcpSkill}

HYRO Playground runs local read tools (balance, DexScreener, B20). Full wallet/send/swap flows use mcp.base.org.`;

export const BANKR_X402_GUIDE = `Bankr x402 Cloud — pay-per-request APIs on Base

What it is:
• Deploy any TypeScript handler as a live USDC-gated HTTP endpoint
• Bankr handles hosting, x402 payment verification, and on-chain USDC settlement on Base
• No accounts or API keys for callers — agents pay per request via x402

Quick start:
  npm i -g @bankr/cli   # or use npx
  bankr x402 init
  # Edit handler in x402/<service>/index.ts (plain Request → Response)
  bankr x402 deploy
  bankr x402 call https://x402.bankr.bot/<wallet>/<service> -i

Paid client (x402-fetch):
  import { wrapFetchWithPayment } from "x402-fetch";
  const paidFetch = wrapFetchWithPayment(fetch, wallet, maxPayment);
  await paidFetch("https://x402.bankr.bot/...");

HYRO agents:
• Monetize MCP tools with @x402/mcp createPaymentWrapper on VPS
• Tag settlements with Builder Codes (builderCode=hyro) on Base mainnet

Links:
• ${INTEGRATION_URLS.bankrX402}
• ${INTEGRATION_URLS.bankrX402Docs}
• ${INTEGRATION_URLS.x402McpNpm}`;

export const X402_FLOW_GUIDE = `x402 — HTTP 402 payments in USDC on Base

Flow:
1. Client requests a protected resource
2. Server responds HTTP 402 + payment requirements (amount, USDC, network, recipient)
3. Client signs x402 payment (EIP-3009 on Base)
4. Client retries with payment header; facilitator verifies and settles

HYRO stack:
• Playground + VPS MCP: read tools free; paid endpoints via Bankr x402 Cloud or @x402/mcp
• B20 + Builder Codes: tag onchain attribution alongside x402 settlements
• Bankr x402 Cloud: bankr x402 deploy for hosted paid APIs

Coinbase facilitator: fee-free USDC on Base mainnet.
Testnet: use Base Sepolia USDC + Sepolia facilitator where supported.

Docs: ${INTEGRATION_URLS.x402Docs}`;
