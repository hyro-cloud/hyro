import type { Address, Hex } from 'viem';

const STORAGE_KEY = 'hyro.b20.tokens';

export interface SavedB20Token {
  id: string;
  address: Address;
  name: string;
  symbol: string;
  variant: 'asset' | 'stablecoin';
  decimals: number;
  deployer: Address;
  txHash: Hex;
  salt: Hex;
  chainId: number;
  createdAt: number;
}

export function loadSavedTokens(): SavedB20Token[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedB20Token[];
  } catch {
    return [];
  }
}

export function saveToken(token: SavedB20Token): void {
  const all = loadSavedTokens().filter((t) => t.address.toLowerCase() !== token.address.toLowerCase());
  all.unshift(token);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 50)));
}

export function tokensForDeployer(deployer: Address): SavedB20Token[] {
  return loadSavedTokens().filter((t) => t.deployer.toLowerCase() === deployer.toLowerCase());
}
