import { randomUUID } from 'node:crypto';
import { privateKeyToAccount } from 'viem/accounts';
import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch';
import type { Listing, Receipt } from './types';

/** Real x402 settlement is available only when a signing wallet is configured. */
export function paymentConfigured(): boolean {
  return !!process.env.WALLET_PRIVATE_KEY?.trim();
}

interface SettleInfo {
  transaction?: string;
  network?: string;
  payer?: string;
}

/**
 * Actually pay for and call a live x402 endpoint using the server wallet.
 * The wallet signs the x402 payment (EIP-3009 USDC transfer authorization); the
 * facilitator settles it on Base. Throws if the wallet is missing or the call fails.
 */
export async function payAndFetch(listing: Listing): Promise<{ result: unknown; receipt: Receipt }> {
  const raw = process.env.WALLET_PRIVATE_KEY?.trim();
  if (!raw) throw new Error('WALLET_PRIVATE_KEY not configured');
  const pk = (raw.startsWith('0x') ? raw : `0x${raw}`) as `0x${string}`;
  const account = privateKeyToAccount(pk);

  // Cap what we are willing to pay for this call (atomic USDC, 6 decimals) + tiny buffer.
  // The x402 payment is signed off-chain (no RPC needed here); the endpoint's 402
  // decides the network (base / base-sepolia) and the facilitator settles it.
  const perCall = Math.ceil(Number(listing.price) * 1e6) + 100;
  const capUsd = Number(process.env.MARKETPLACE_MAX_USDC ?? '');
  const cap = Number.isFinite(capUsd) && capUsd > 0 ? Math.floor(capUsd * 1e6) : perCall;
  const maxValue = BigInt(Math.min(perCall, cap));
  // Cast: viem may be resolved twice in the workspace, so the LocalAccount type is
  // nominally different from x402-fetch's Signer type though runtime-compatible.
  const signer = account as unknown as Parameters<typeof wrapFetchWithPayment>[1];
  const fetchWithPay = wrapFetchWithPayment(fetch, signer, maxValue);

  const res = await fetchWithPay(listing.x402Url, { method: 'GET' });
  if (!res.ok) throw new Error(`endpoint returned HTTP ${res.status}`);
  const result = await res.json();

  const header = res.headers.get('x-payment-response');
  const settle = header ? (decodeXPaymentResponse(header) as SettleInfo) : null;

  const receipt: Receipt = {
    id: 'rcpt_' + randomUUID().replace(/-/g, '').slice(0, 18),
    status: 'settled',
    sandbox: false,
    network: settle?.network ?? listing.network,
    asset: listing.currency,
    amount: listing.price,
    payer: account.address,
    payTo: listing.x402Url.match(/0x[0-9a-fA-F]{40}/)?.[0] ?? account.address,
    txHash: settle?.transaction ?? '',
    builderCode: listing.builderCode,
    resource: listing.x402Url,
    settledMs: 0,
    timestamp: new Date().toISOString(),
  };
  return { result, receipt };
}
