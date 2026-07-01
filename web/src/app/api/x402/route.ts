import { NextResponse } from 'next/server';
import { randomBytes, randomUUID } from 'node:crypto';
import { USDC_BY_CHAIN } from '@/lib/integrations/onchain';

export const runtime = 'nodejs';

/**
 * Sandbox x402 endpoint that demonstrates the real HTTP-402 handshake without
 * moving funds. A request with no `X-PAYMENT` header gets a 402 with x402-shaped
 * payment requirements; a request that carries the header gets 200 + a signed-style
 * receipt. Clearly labelled sandbox so nobody mistakes it for live settlement.
 */

const PRICE_USDC = '0.01';
const PRICE_ATOMIC = '10000'; // 0.01 USDC at 6 decimals
const PAY_TO = '0x6862E3aB6cE2C5b2F0bE3a4F2ED3C1b0AD9F0001'; // HYRO demo treasury (sandbox)
const RESOURCE = '/api/x402';

function hex(bytes: number): string {
  return '0x' + randomBytes(bytes).toString('hex');
}

function paymentRequirements() {
  return {
    x402Version: 1,
    error: 'Payment required',
    accepts: [
      {
        scheme: 'exact',
        network: 'base',
        maxAmountRequired: PRICE_ATOMIC,
        resource: RESOURCE,
        description: 'HYRO premium onchain snapshot (sandbox demo)',
        mimeType: 'application/json',
        payTo: PAY_TO,
        asset: USDC_BY_CHAIN[8453],
        maxTimeoutSeconds: 60,
        extra: { name: 'USDC', decimals: 6, priceUsd: PRICE_USDC, builderCode: 'hyro' },
      },
    ],
  };
}

function snapshot() {
  // Demo payload — the "premium data" the agent paid for.
  const base = 2400 + Math.random() * 120;
  return {
    tool: 'hyro.onchain.snapshot',
    network: 'base',
    chainId: 8453,
    block: 18_000_000 + Math.floor(Math.random() * 500_000),
    pair: 'ETH/USDC',
    price: Number(base.toFixed(2)),
    gasGwei: Number((0.004 + Math.random() * 0.01).toFixed(4)),
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET(req: Request) {
  const hasPayment = req.headers.get('x-payment');

  if (!hasPayment) {
    // 402 Payment Required — the x402 challenge.
    return NextResponse.json(paymentRequirements(), {
      status: 402,
      headers: { 'x-accept-payment': 'x402', 'cache-control': 'no-store' },
    });
  }

  // "Payment" present → settle (sandbox) and return the result + receipt.
  const now = Date.now();
  const receipt = {
    id: 'rcpt_' + randomUUID().replace(/-/g, '').slice(0, 18),
    x402Version: 1,
    sandbox: true,
    status: 'settled',
    network: 'base',
    chainId: 8453,
    asset: 'USDC',
    assetAddress: USDC_BY_CHAIN[8453],
    amount: PRICE_USDC,
    amountAtomic: PRICE_ATOMIC,
    payer: hex(20),
    payTo: PAY_TO,
    txHash: hex(32),
    builderCode: 'hyro',
    scheme: 'exact',
    resource: RESOURCE,
    settledMs: 600 + Math.floor(Math.random() * 700),
    timestamp: new Date(now).toISOString(),
  };

  return NextResponse.json(
    { ok: true, result: snapshot(), receipt },
    { status: 200, headers: { 'x-payment-response': 'settled', 'cache-control': 'no-store' } },
  );
}
