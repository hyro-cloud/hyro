// Client-safe marketplace types (no server-only imports here).

export type ListingKind = 'skill' | 'memory';

export interface Listing {
  slug: string;
  kind: ListingKind;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  /** Price in USD, charged in USDC on Base (x402). */
  price: string;
  currency: 'USDC';
  network: 'base' | 'base-sepolia';
  /** Bankr x402 Cloud endpoint that settles the payment and returns the result. */
  x402Url: string;
  seller: string;
  builderCode: string;
  /** true = wired to a funded wallet for real settlement; false = sandbox demo. */
  live: boolean;
  installs: number;
  createdAt: string;
}

export interface Receipt {
  id: string;
  status: 'settled';
  sandbox: boolean;
  network: string;
  asset: string;
  amount: string;
  payer: string;
  payTo: string;
  txHash: string;
  builderCode: string;
  resource: string;
  settledMs: number;
  timestamp: string;
}

export interface MemoryItem {
  type: string;
  content: string;
}

export interface BuyResponse {
  ok: boolean;
  slug: string;
  kind: ListingKind;
  receipt: Receipt;
  /** Skill output. */
  result?: unknown;
  /** Memory pack payload for `hyro memory import`. */
  memory?: { items: MemoryItem[]; jsonl: string; importCmd: string };
}

export interface PublishInput {
  title: string;
  kind: ListingKind;
  category: string;
  price: string;
  x402Url: string;
  summary?: string;
  tags?: string[];
  seller?: string;
}
