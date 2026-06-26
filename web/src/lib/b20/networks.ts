import { base, baseSepolia, type Chain } from 'viem/chains';

/** Beryl mainnet activation — June 26, 2026 at 6pm UTC (per Base docs). */
export const B20_MAINNET_ACTIVATION_MS = Date.parse('2026-06-26T18:00:00.000Z');

/** Registry may take ~1 hour after Beryl activates. */
export const B20_MAINNET_REGISTRY_READY_MS = B20_MAINNET_ACTIVATION_MS + 60 * 60 * 1000;

export type B20NetworkId = 'sepolia' | 'mainnet';

export interface B20Network {
  id: B20NetworkId;
  chain: Chain;
  name: string;
  label: string;
  chainIdHex: `0x${string}`;
  explorer: string;
  faucetUrl?: string;
  rpcUrl: string;
  isTestnet: boolean;
}

export const B20_NETWORKS: Record<B20NetworkId, B20Network> = {
  sepolia: {
    id: 'sepolia',
    chain: baseSepolia,
    name: 'Base Sepolia',
    label: 'Base Sepolia',
    chainIdHex: `0x${baseSepolia.id.toString(16)}` as `0x${string}`,
    explorer: 'https://sepolia.basescan.org',
    faucetUrl: 'https://portal.cdp.coinbase.com/products/faucet',
    rpcUrl: 'https://sepolia.base.org',
    isTestnet: true,
  },
  mainnet: {
    id: 'mainnet',
    chain: base,
    name: 'Base Mainnet',
    label: 'Base Mainnet',
    chainIdHex: `0x${base.id.toString(16)}` as `0x${string}`,
    explorer: 'https://basescan.org',
    rpcUrl: 'https://mainnet.base.org',
    isTestnet: false,
  },
};

export const B20_NETWORK_LIST: B20NetworkId[] = ['sepolia', 'mainnet'];

const NETWORK_STORAGE_KEY = 'hyro.b20.network';

export function getB20Network(id: B20NetworkId): B20Network {
  return B20_NETWORKS[id];
}

export function networkIdFromChainId(chainId: number): B20NetworkId | null {
  if (chainId === baseSepolia.id) return 'sepolia';
  if (chainId === base.id) return 'mainnet';
  return null;
}

export function loadB20NetworkPreference(): B20NetworkId {
  if (typeof window === 'undefined') return 'sepolia';
  try {
    const v = localStorage.getItem(NETWORK_STORAGE_KEY);
    if (v === 'mainnet' || v === 'sepolia') return v;
  } catch {
    /* ignore */
  }
  return 'sepolia';
}

export function saveB20NetworkPreference(id: B20NetworkId): void {
  try {
    localStorage.setItem(NETWORK_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function isBeforeMainnetActivation(now = Date.now()): boolean {
  return now < B20_MAINNET_ACTIVATION_MS;
}

export function mainnetOpensInMs(now = Date.now()): number {
  return Math.max(0, B20_MAINNET_ACTIVATION_MS - now);
}

export function formatMainnetCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
