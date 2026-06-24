import type { Address, Hex } from 'viem';
import { decodeEventLog, formatUnits, keccak256, stringToBytes } from 'viem';
import {
  ACTIVATION_ABI,
  ACTIVATION_REGISTRY,
  B20_FACTORY,
  B20_VARIANT_ASSET,
  B20_VARIANT_STABLECOIN,
  EXPLORER,
  FACTORY_ABI,
  MAX_SUPPLY_CAP,
  MINT_ROLE,
  PAUSABLE_ALL,
  PAUSABLE_BURN,
  PAUSABLE_MINT,
  PAUSABLE_TRANSFER,
  SEPOLIA,
  TOKEN_READ_ABI,
  buildLaunchArgs,
  ensureBaseSepolia,
  publicClient,
  walletClient,
  type Eip1193Provider,
  type LaunchInputs,
} from '@/lib/b20/launch';
import { tokensForDeployer, type SavedB20Token } from '@/lib/b20/storage';

export type { Eip1193Provider, LaunchInputs };

const B20_ASSET_FEATURE = keccak256(stringToBytes('base.b20_asset'));
const B20_STABLE_FEATURE = keccak256(stringToBytes('base.b20_stablecoin'));

export interface ActivationStatus {
  asset: boolean;
  stablecoin: boolean;
}

export async function checkB20Activation(): Promise<ActivationStatus> {
  const client = publicClient();
  const [asset, stablecoin] = await Promise.all([
    client.readContract({
      address: ACTIVATION_REGISTRY,
      abi: ACTIVATION_ABI,
      functionName: 'isActivated',
      args: [B20_ASSET_FEATURE],
    }),
    client.readContract({
      address: ACTIVATION_REGISTRY,
      abi: ACTIVATION_ABI,
      functionName: 'isActivated',
      args: [B20_STABLE_FEATURE],
    }),
  ]);
  return { asset, stablecoin };
}

export async function predictTokenAddress(
  variant: number,
  sender: Address,
  salt: Hex,
): Promise<Address> {
  return publicClient().readContract({
    address: B20_FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getB20Address',
    args: [variant, sender, salt],
  });
}

/** Parse token address from B20Created event — most reliable after deploy. */
export function tokenFromReceiptLogs(logs: { address: Address; data: Hex; topics: Hex[] }[]): Address | null {
  for (const log of logs) {
    if (log.address.toLowerCase() !== B20_FACTORY.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: FACTORY_ABI,
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      if (decoded.eventName === 'B20Created') {
        return decoded.args.token as Address;
      }
    } catch {
      /* not B20Created */
    }
  }
  return null;
}

async function resolveDeployedToken(
  hash: Hex,
  variant: number,
  salt: Hex,
  fallbackSender: Address,
): Promise<Address> {
  const client = publicClient();
  const receipt = await client.getTransactionReceipt({ hash });
  const fromEvent = tokenFromReceiptLogs(receipt.logs);
  if (fromEvent) return fromEvent;

  const tx = await client.getTransaction({ hash });
  const deployer = tx.from;
  const predicted = await predictTokenAddress(variant, deployer, salt);

  // Retry — RPC can lag right after mining
  for (let i = 0; i < 4; i++) {
    const initialized = await client.readContract({
      address: B20_FACTORY,
      abi: FACTORY_ABI,
      functionName: 'isB20Initialized',
      args: [predicted],
    });
    if (initialized) return predicted;
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Fallback: try predicted with connected account
  if (deployer.toLowerCase() !== fallbackSender.toLowerCase()) {
    const alt = await predictTokenAddress(variant, fallbackSender, salt);
    const ok = await client.readContract({
      address: B20_FACTORY,
      abi: FACTORY_ABI,
      functionName: 'isB20Initialized',
      args: [alt],
    });
    if (ok) return alt;
  }

  throw new Error(
    'Deploy tx mined but B20 token address could not be confirmed. Open the tx on BaseScan — if B20Created fired, the token exists; retry or contact support.',
  );
}

export interface DeployResult {
  txHash: Hex;
  token: Address;
  salt: Hex;
  explorerTxUrl: string;
  explorerTokenUrl: string;
  blockNumber: bigint;
}

export async function deployB20Token(
  provider: Eip1193Provider,
  account: Address,
  input: LaunchInputs,
): Promise<DeployResult> {
  await ensureBaseSepolia(provider);
  const args = buildLaunchArgs(account, input);
  const wallet = walletClient(provider, account);

  const hash = await wallet.writeContract({
    address: B20_FACTORY,
    abi: FACTORY_ABI,
    functionName: 'createB20',
    args: [args.variant, args.salt, args.params, args.initCalls],
    account,
    chain: wallet.chain,
  });

  const receipt = await publicClient().waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') {
    throw new Error('Transaction reverted — check initCalls, salt reuse, or wallet network (must be Base Sepolia 84532).');
  }

  if (wallet.chain?.id !== SEPOLIA.id) {
    throw new Error(`Wrong chain: wallet on chain ${wallet.chain?.id ?? 'unknown'}, expected Base Sepolia (${SEPOLIA.id}).`);
  }

  const token = await resolveDeployedToken(hash, args.variant, args.salt, account);

  return {
    txHash: hash,
    token,
    salt: args.salt,
    explorerTxUrl: `${EXPLORER}/tx/${hash}`,
    explorerTokenUrl: `${EXPLORER}/address/${token}`,
    blockNumber: receipt.blockNumber,
  };
}

export interface TokenOnchainInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  supplyCap: string;
  uncapped: boolean;
  /** True when MINT feature is paused (blocks mint). */
  paused: boolean;
  mintPaused: boolean;
  transferPaused: boolean;
  burnPaused: boolean;
  canMint: boolean;
}

export async function readTokenInfo(token: Address, account?: Address): Promise<TokenOnchainInfo> {
  const client = publicClient();
  const [name, symbol, decimals, totalSupply, canMint] = await Promise.all([
    client.readContract({ address: token, abi: TOKEN_READ_ABI, functionName: 'name' }),
    client.readContract({ address: token, abi: TOKEN_READ_ABI, functionName: 'symbol' }),
    client.readContract({ address: token, abi: TOKEN_READ_ABI, functionName: 'decimals' }),
    client.readContract({ address: token, abi: TOKEN_READ_ABI, functionName: 'totalSupply' }),
    account
      ? client.readContract({
          address: token,
          abi: TOKEN_READ_ABI,
          functionName: 'hasRole',
          args: [MINT_ROLE, account],
        })
      : Promise.resolve(false),
  ]);

  let supplyCapRaw = MAX_SUPPLY_CAP;
  try {
    supplyCapRaw = await client.readContract({
      address: token,
      abi: TOKEN_READ_ABI,
      functionName: 'supplyCap',
    });
  } catch {
    /* optional on some builds */
  }

  let transferPaused = false;
  let mintPaused = false;
  let burnPaused = false;
  try {
    [transferPaused, mintPaused, burnPaused] = await Promise.all([
      client.readContract({
        address: token,
        abi: TOKEN_READ_ABI,
        functionName: 'isPaused',
        args: [PAUSABLE_TRANSFER],
      }),
      client.readContract({
        address: token,
        abi: TOKEN_READ_ABI,
        functionName: 'isPaused',
        args: [PAUSABLE_MINT],
      }),
      client.readContract({
        address: token,
        abi: TOKEN_READ_ABI,
        functionName: 'isPaused',
        args: [PAUSABLE_BURN],
      }),
    ]);
  } catch {
    /* pause reads optional */
  }

  const uncapped = supplyCapRaw >= MAX_SUPPLY_CAP;
  return {
    name,
    symbol,
    decimals,
    totalSupply: formatUnits(totalSupply, decimals),
    supplyCap: uncapped ? 'uncapped' : formatUnits(supplyCapRaw, decimals),
    uncapped,
    paused: mintPaused,
    mintPaused,
    transferPaused,
    burnPaused,
    canMint,
  };
}

/** Tokens this wallet can mint — saved deployments + on-chain B20Created scan. */
export async function listMintableTokens(account: Address): Promise<SavedB20Token[]> {
  const client = publicClient();
  const byAddress = new Map<string, SavedB20Token>();

  for (const tok of tokensForDeployer(account)) {
    byAddress.set(tok.address.toLowerCase(), tok);
  }

  try {
    const events = await client.getContractEvents({
      address: B20_FACTORY,
      abi: FACTORY_ABI,
      eventName: 'B20Created',
      fromBlock: 0n,
      toBlock: 'latest',
    });

    for (const ev of events) {
      const token = ev.args.token as Address;
      const key = token.toLowerCase();
      if (byAddress.has(key)) continue;

      const canMint = await client.readContract({
        address: token,
        abi: TOKEN_READ_ABI,
        functionName: 'hasRole',
        args: [MINT_ROLE, account],
      });
      if (!canMint) continue;

      const [name, symbol, decimals] = await Promise.all([
        client.readContract({ address: token, abi: TOKEN_READ_ABI, functionName: 'name' }),
        client.readContract({ address: token, abi: TOKEN_READ_ABI, functionName: 'symbol' }),
        client.readContract({ address: token, abi: TOKEN_READ_ABI, functionName: 'decimals' }),
      ]);

      byAddress.set(key, {
        id: key,
        address: token,
        name,
        symbol,
        variant: ev.args.variant === B20_VARIANT_STABLECOIN ? 'stablecoin' : 'asset',
        decimals,
        deployer: account,
        txHash: '0x' as Hex,
        salt: '0x' as Hex,
        chainId: SEPOLIA.id,
        createdAt: Date.now(),
      });
    }
  } catch {
    /* RPC log scan failed — fall back to localStorage only */
  }

  const mintable: SavedB20Token[] = [];
  for (const tok of byAddress.values()) {
    const canMint = await client.readContract({
      address: tok.address,
      abi: TOKEN_READ_ABI,
      functionName: 'hasRole',
      args: [MINT_ROLE, account],
    });
    if (canMint) mintable.push(tok);
  }

  return mintable.sort((a, b) => b.createdAt - a.createdAt);
}

export async function mintTokens(
  provider: Eip1193Provider,
  account: Address,
  token: Address,
  to: Address,
  amount: bigint,
): Promise<Hex> {
  await ensureBaseSepolia(provider);
  const wallet = walletClient(provider, account);
  return wallet.writeContract({
    address: token,
    abi: TOKEN_READ_ABI,
    functionName: 'mint',
    args: [to, amount],
    account,
    chain: wallet.chain,
  });
}

export async function burnTokens(
  provider: Eip1193Provider,
  account: Address,
  token: Address,
  amount: bigint,
): Promise<Hex> {
  await ensureBaseSepolia(provider);
  const wallet = walletClient(provider, account);
  return wallet.writeContract({
    address: token,
    abi: TOKEN_READ_ABI,
    functionName: 'burn',
    args: [amount],
    account,
    chain: wallet.chain,
  });
}

export async function setPaused(
  provider: Eip1193Provider,
  account: Address,
  token: Address,
  pause: boolean,
): Promise<Hex> {
  await ensureBaseSepolia(provider);
  const wallet = walletClient(provider, account);
  return wallet.writeContract({
    address: token,
    abi: TOKEN_READ_ABI,
    functionName: pause ? 'pause' : 'unpause',
    args: [[...PAUSABLE_ALL]],
    account,
    chain: wallet.chain,
  });
}

export function variantFromKind(kind: LaunchInputs['variant']): number {
  return kind === 'stablecoin' ? B20_VARIANT_STABLECOIN : B20_VARIANT_ASSET;
}
