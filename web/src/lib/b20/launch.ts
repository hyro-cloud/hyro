/**
 * B20 token launch — Base Sepolia first.
 *
 * B20 is a native Base precompile (not an EVM contract). All tokens are created
 * through a singleton B20 Factory precompile at 0xB20f…0000 via
 * `createB20(variant, salt, params, initCalls)`.
 *
 * Encoding mirrors base/base-std `B20FactoryLib`:
 *   params (ASSET) = abi.encode(B20AssetCreateParams{version:1, name, symbol, initialAdmin, decimals})
 *   initCalls      = [updateSupplyCap(cap), grantRole(MINT_ROLE, admin), batchMint([admin],[amount])]
 *
 * Docs: https://docs.base.org/get-started/launch-b20-token
 */
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeAbiParameters,
  encodeFunctionData,
  http,
  keccak256,
  parseUnits,
  stringToBytes,
  toHex,
  type Address,
  type Hex,
} from 'viem';
import { baseSepolia } from 'viem/chains';

/** Singleton B20 Factory precompile — same address on every Base network. */
export const B20_FACTORY: Address = '0xB20f000000000000000000000000000000000000';

/** ASSET = 0, STABLECOIN = 1 */
export const B20_VARIANT_ASSET = 0;
export const B20_VARIANT_STABLECOIN = 1;

/** Activation Registry precompile — Beryl feature flags. */
export const ACTIVATION_REGISTRY: Address = '0x8453000000000000000000000000000000000001';

export const ACTIVATION_ABI = [
  {
    type: 'function',
    name: 'isActivated',
    stateMutability: 'view',
    inputs: [{ name: 'featureId', type: 'bytes32' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

/** Encoding version byte for B20 create params (currently 1). */
const PARAMS_VERSION = 1;

/** Role id = keccak256("MINT_ROLE") — from B20Constants. */
export const MINT_ROLE: Hex = keccak256(stringToBytes('MINT_ROLE'));
export const BURN_ROLE: Hex = keccak256(stringToBytes('BURN_ROLE'));

/** Uncapped sentinel: type(uint128).max. */
export const MAX_SUPPLY_CAP = (1n << 128n) - 1n;

export const SEPOLIA = baseSepolia;
export const SEPOLIA_CHAIN_ID_HEX = `0x${baseSepolia.id.toString(16)}` as const; // 0x14a34
export const FAUCET_URL = 'https://portal.cdp.coinbase.com/products/faucet';
export const EXPLORER = 'https://sepolia.basescan.org';

/** Factory ABI — only what we call. */
export const FACTORY_ABI = [
  {
    type: 'function',
    name: 'createB20',
    stateMutability: 'payable',
    inputs: [
      { name: 'variant', type: 'uint8' },
      { name: 'salt', type: 'bytes32' },
      { name: 'params', type: 'bytes' },
      { name: 'initCalls', type: 'bytes[]' },
    ],
    outputs: [{ name: 'token', type: 'address' }],
  },
  {
    type: 'function',
    name: 'getB20Address',
    stateMutability: 'view',
    inputs: [
      { name: 'variant', type: 'uint8' },
      { name: 'sender', type: 'address' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'isB20Initialized',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'event',
    name: 'B20Created',
    inputs: [
      { indexed: true, name: 'token', type: 'address' },
      { indexed: true, name: 'variant', type: 'uint8' },
      { indexed: false, name: 'name', type: 'string' },
      { indexed: false, name: 'symbol', type: 'string' },
      { indexed: false, name: 'decimals', type: 'uint8' },
      { indexed: false, name: 'variantEventParams', type: 'bytes' },
    ],
  },
] as const;

/** Token ABI — used to encode initCalls (executed on the new token at creation). */
export const TOKEN_ABI = [
  {
    type: 'function',
    name: 'updateSupplyCap',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newSupplyCap', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'grantRole',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'batchMint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipients', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
    ],
    outputs: [],
  },
] as const;

/** B20 granular pause — PausableFeature enum (append-only). */
export const PAUSABLE_TRANSFER = 0;
export const PAUSABLE_MINT = 1;
export const PAUSABLE_BURN = 2;
export const PAUSABLE_ALL = [PAUSABLE_TRANSFER, PAUSABLE_MINT, PAUSABLE_BURN] as const;

/** Read + manage ABI for deployed tokens (IB20). */
export const TOKEN_READ_ABI = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'supplyCap', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'isPaused',
    stateMutability: 'view',
    inputs: [{ name: 'feature', type: 'uint8' }],
    outputs: [{ type: 'bool' }],
  },
  { type: 'function', name: 'hasRole', stateMutability: 'view', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'burn', stateMutability: 'nonpayable', inputs: [{ type: 'uint256' }], outputs: [] },
  {
    type: 'function',
    name: 'pause',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'features', type: 'uint8[]' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'unpause',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'features', type: 'uint8[]' }],
    outputs: [],
  },
  { type: 'function', name: 'grantRole', stateMutability: 'nonpayable', inputs: [{ type: 'bytes32' }, { type: 'address' }], outputs: [] },
] as const;

/** abi.encode(B20AssetCreateParams{ version, name, symbol, initialAdmin, decimals }) */
export function encodeAssetCreateParams(
  name: string,
  symbol: string,
  initialAdmin: Address,
  decimals: number,
): Hex {
  return encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          { name: 'version', type: 'uint8' },
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'initialAdmin', type: 'address' },
          { name: 'decimals', type: 'uint8' },
        ],
      },
    ],
    [
      {
        version: PARAMS_VERSION,
        name,
        symbol,
        initialAdmin,
        decimals,
      },
    ],
  );
}

export function encodeStablecoinCreateParams(
  name: string,
  symbol: string,
  initialAdmin: Address,
  currencyCode: string,
): Hex {
  return encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          { name: 'version', type: 'uint8' },
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'initialAdmin', type: 'address' },
          { name: 'currencyCode', type: 'string' },
        ],
      },
    ],
    [
      {
        version: PARAMS_VERSION,
        name,
        symbol,
        initialAdmin,
        currencyCode: currencyCode.toUpperCase().slice(0, 3),
      },
    ],
  );
}

/** Random bytes32 salt (deterministic address is derived from variant+sender+salt). */
export function randomSalt(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export type B20VariantKind = 'asset' | 'stablecoin';

export interface LaunchInputs {
  variant: B20VariantKind;
  name: string;
  symbol: string;
  decimals: number;
  currencyCode?: string;
  /** Initial supply minted to admin, in whole tokens. */
  supply: string;
  uncapped: boolean;
  supplyCap: string;
  /** Grant MINT_ROLE to deployer at creation (deployb20.xyz default). */
  grantMintRole: boolean;
  salt?: Hex;
}

export interface LaunchArgs {
  variant: number;
  salt: Hex;
  params: Hex;
  initCalls: Hex[];
}

/** Build createB20 args — mirrors base-std B20FactoryLib encoding. */
export function buildLaunchArgs(admin: Address, input: LaunchInputs): LaunchArgs {
  const salt = input.salt ?? randomSalt();
  const isStable = input.variant === 'stablecoin';
  const decimals = isStable ? 6 : input.decimals;
  const params = isStable
    ? encodeStablecoinCreateParams(input.name, input.symbol, admin, input.currencyCode || 'USD')
    : encodeAssetCreateParams(input.name, input.symbol, admin, decimals);

  const cap = input.uncapped
    ? MAX_SUPPLY_CAP
    : parseUnits(input.supplyCap || '1000000', decimals);

  const amount = parseUnits(input.supply || '0', decimals);

  const initCalls: Hex[] = [];
  if (input.grantMintRole !== false) {
    initCalls.push(encodeCall('grantRole', [MINT_ROLE, admin]));
  }
  initCalls.push(encodeCall('updateSupplyCap', [cap]));
  if (amount > 0n) {
    initCalls.push(encodeCall('batchMint', [[admin], [amount]]));
  }

  return {
    variant: isStable ? B20_VARIANT_STABLECOIN : B20_VARIANT_ASSET,
    salt,
    params,
    initCalls,
  };
}

// Local helper so we don't import encodeFunctionData at call sites.
function encodeCall(name: 'updateSupplyCap' | 'grantRole' | 'batchMint', args: unknown[]): Hex {
  return encodeFunctionData({
    abi: TOKEN_ABI,
    functionName: name,
    args: args as never,
  });
}

/** Read-only client for Base Sepolia (used for address prediction + receipts). */
export function publicClient() {
  return createPublicClient({ chain: SEPOLIA, transport: http() });
}

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

export function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null;
  const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  return eth ?? null;
}

/** Wallet client bound to the injected provider on Base Sepolia. */
export function walletClient(provider: Eip1193Provider, account: Address) {
  return createWalletClient({ account, chain: SEPOLIA, transport: custom(provider) });
}

/** Ensure the wallet is on Base Sepolia, adding the chain if the wallet doesn't know it. */
export async function ensureBaseSepolia(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (err) {
    const code = (err as { code?: number }).code;
    // 4902 = chain not added to wallet
    if (code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID_HEX,
            chainName: 'Base Sepolia',
            nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://sepolia.base.org'],
            blockExplorerUrls: [EXPLORER],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}
