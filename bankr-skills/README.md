# HYRO Official Skills — Bankr x402 Cloud handlers

Ten deploy-ready x402 skill handlers that back the official listings in the HYRO
Marketplace (`/marketplace`). Deploy them on Bankr under your HYRO wallet, and the
listings flip from `sandbox` to `live` automatically.

## Prices & inputs

| Slug | Price (USD) | Query input | Deps / env |
| --- | --- | --- | --- |
| `base-gas-oracle` | 0.002 | — | `bun add viem` |
| `usdc-balance` | 0.001 | `?address=` | `bun add viem` |
| `token-metadata` | 0.001 | `?token=` | `bun add viem` |
| `token-sniff` | 0.005 | `?token=` | none (fetch) |
| `dex-quote` | 0.006 | `?token=&amount=` | none (fetch) |
| `contract-abi` | 0.003 | `?address=` | env `BASESCAN_API_KEY` |
| `tx-decoder` | 0.004 | `?hash=` | `bun add viem` |
| `basename-resolver` | 0.002 | `?name=` or `?address=` | `bun add viem` |
| `wallet-risk-score` | 0.01 | `?address=` | `bun add viem` |
| `wallet-pnl` | 0.008 | `?address=` | `bun add viem` |

## Deploy (per skill)

```bash
# 1. scaffold a service with the SAME name as the slug
bankr x402 add                 # e.g. name: base-gas-oracle

# 2. replace the scaffolded x402/<slug>/index.ts with the file from this repo
#    (copy bankr-skills/x402/<slug>/index.ts over it)

# 3. install deps for that service if it needs viem
cd x402/<slug> && bun add viem && cd ../..

# 4. set the price (bankr.x402.json or the interactive configurator) and any env
bankr x402 env set BASESCAN_API_KEY <key>   # only for contract-abi

# 5. deploy
bankr x402 deploy
# -> https://x402.bankr.bot/<yourWallet>/<slug>
```

Tip: you can also copy this whole `x402/` folder into your Bankr working directory
and run `bankr x402 deploy` once to ship all of them together.

## Wire them into the HYRO Marketplace

1. In your web env (Vercel / VPS) set `HYRO_X402_WALLET=<yourBankrWalletAddress>`
   (public address only — not a private key). The official listing URLs now point
   at your deployments.
2. Set `WALLET_PRIVATE_KEY` to a dedicated hot wallet with USDC so the Buy button
   settles real payments. Optional cap: `MARKETPLACE_MAX_USDC=0.10`.
3. Test for free first: deploy on `base-sepolia` and fund the buyer wallet with
   testnet USDC. Switch to Base mainnet for real revenue.

## Notes

- `basename-resolver` resolves ENS `.eth` names via mainnet. For Base-native
  `.base.eth` names, pass the Base UniversalResolver to `getEnsAddress` /
  `getEnsName`.
- `wallet-pnl` returns a live holdings snapshot; wire a trade indexer
  (Zerion / Covalent) via env to fill realized PnL.
- Handlers return plain objects (Bankr auto-wraps to JSON) and never touch private
  keys — they are read-only.
