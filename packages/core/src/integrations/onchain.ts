/** Onchain integration constants — shared by CLI local MCP and docs. */

export const BASE_MCP_URL = 'https://mcp.base.org';

export const USDC_BY_CHAIN: Record<number, `0x${string}`> = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  84532: '0x036CbD53842c5426634e7929541c8C8aF941b5',
};

export const BASE_MCP_QUICKSTART_GUIDE = `Base MCP quickstart (HYRO + official Base Account)

1. Connect MCP: ${BASE_MCP_URL}
   Cursor: .cursor/mcp.json → { "base-mcp": { "url": "${BASE_MCP_URL}" } }
   CLI:    hyro mcp install base-official  (needs OAuth — use Cursor for wallet writes)
   Skill:  npx skills add base/skills --skill base-mcp -a cursor

2. HYRO local reads (no login): hyro mcp call base get_usdc_balance address=0x...

3. VPS agent (login + connect base): hyro connect base → hyro run "check USDC balance"

Docs: https://docs.base.org/agents/quickstart`;

export const BANKR_X402_GUIDE = `Bankr x402 Cloud — pay-per-request APIs on Base

  bankr x402 init
  bankr x402 deploy
  bankr x402 call https://x402.bankr.bot/<wallet>/<service> -i

Links: https://bankr.bot/x402 · https://docs.bankr.bot/x402-cloud/quick-start`;

export const X402_FLOW_GUIDE = `x402 — HTTP 402 USDC on Base. Agent pays per call; Coinbase facilitator on mainnet.
Docs: https://docs.cdp.coinbase.com/x402/core-concepts/how-it-works`;

export const X402_MCP_GUIDE = `Monetize MCP tools: npm @x402/mcp — createPaymentWrapper on VPS MCP host.`;

export const B20_LAUNCH_GUIDE = `B20 token launch on Base:
Docs: https://docs.base.org/get-started/launch-b20-token
HYRO: hyro mcp call base b20_launch_guide`;
