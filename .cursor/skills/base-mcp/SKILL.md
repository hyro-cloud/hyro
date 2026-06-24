---
name: base-mcp
description: Base MCP for HYRO — wallets, USDC, send, swap, x402, and onchain plugins via mcp.base.org. Use with HYRO Playground skills and official Base Account OAuth.
---

# Base MCP (HYRO)

HYRO integrates **official Base MCP** alongside local read tools (`hyro-mcp-base`).

## Connect

1. Ensure `.cursor/mcp.json` includes:
   ```json
   { "mcpServers": { "base-mcp": { "url": "https://mcp.base.org" } } }
   ```
2. Restart Cursor → Settings → MCP → connect `base-mcp` (Base Account OAuth).
3. Install skill: `npx skills add base/skills --skill base-mcp -a cursor`

Full quickstart: https://docs.base.org/agents/quickstart  
HYRO page: https://hyrocloud.lol/mcp

## Onboarding (each session)

Before wallet writes, show the Base MCP disclaimer from the official skill.

Wallet address and balance — only when the user asks or a write needs it.

## HYRO local vs official

| Capability | HYRO `base` MCP (VPS) | Official `mcp.base.org` |
|------------|----------------------|-------------------------|
| ETH / USDC read | ✓ | ✓ |
| B20 guide / balances | ✓ | ✓ |
| Send / swap / yield | guide only | ✓ (approval URL) |
| x402 pay | guides + Bankr x402 | ✓ |
| Bankr token launches | — | ✓ (Bankr plugin) |

## Try prompts

- Show me my wallets
- What's my USDC balance on Base?
- Send 1 USDC to jesse.base.eth
- Find the highest paying USDC yield on Base by APY and deposit 100 USDC

## x402 + Bankr

- Bankr x402 Cloud: https://bankr.bot/x402 — `bankr x402 init` / `deploy`
- HYRO x402 page: https://hyrocloud.lol/x402
- Monetize VPS MCP: `@x402/mcp` package

## References

- Official SKILL.md: https://docs.base.org/agents/skills/SKILL.md
- Base llms index: https://docs.base.org/llms.txt
