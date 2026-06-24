/**
 * Local MCP tool execution on the user's machine — no VPS required.
 * Same read tools as web Playground + HYRO @hyro/mcp-base on VPS.
 */
import {
  BANKR_X402_GUIDE,
  BASE_MCP_QUICKSTART_GUIDE,
  B20_LAUNCH_GUIDE,
  USDC_BY_CHAIN,
  X402_FLOW_GUIDE,
  X402_MCP_GUIDE,
} from '@hyro/core';

function rpcUrl(): string {
  return process.env.BASE_RPC_URL?.trim() || process.env.HYRO_BASE_RPC_URL?.trim() || 'https://mainnet.base.org';
}

function chainMeta(): { chainId: number; name: string } {
  const url = rpcUrl().toLowerCase();
  if (url.includes('sepolia')) return { chainId: 84532, name: 'Base Sepolia' };
  return { chainId: 8453, name: 'Base' };
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: T; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message || 'RPC error');
  return json.result as T;
}

function padAddress(addr: string): string {
  const clean = addr.toLowerCase().replace('0x', '');
  return clean.padStart(64, '0');
}

function weiToEth(hex: string): string {
  const wei = BigInt(hex);
  const whole = wei / 10n ** 18n;
  const frac = wei % 10n ** 18n;
  const fracStr = frac.toString().padStart(18, '0').replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

function decodeString(hex: string): string {
  const raw = hex.replace('0x', '');
  if (raw.length < 128) return '';
  const len = parseInt(raw.slice(64, 128), 16);
  const data = raw.slice(128, 128 + len * 2);
  let out = '';
  for (let i = 0; i < data.length; i += 2) {
    out += String.fromCharCode(parseInt(data.slice(i, i + 2), 16));
  }
  return out;
}

export function parseToolArgs(pairs: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const p of pairs) {
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    args[p.slice(0, eq).trim()] = p.slice(eq + 1).trim();
  }
  return args;
}

export async function executeLocalBaseTool(
  tool: string,
  args: Record<string, string>,
): Promise<string> {
  const chain = chainMeta();

  if (tool === 'get_chain_info') {
    return JSON.stringify(
      {
        chainId: chain.chainId,
        name: chain.name,
        rpcUrl: rpcUrl(),
        walletConfigured: Boolean(process.env.WALLET_PRIVATE_KEY?.trim()),
        mode: 'local-cli',
        b20Docs: 'https://docs.base.org/get-started/launch-b20-token',
      },
      null,
      2,
    );
  }

  if (tool === 'get_balance') {
    const address = args.address?.trim();
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Valid address=0x… required');
    }
    const bal = await rpc<string>('eth_getBalance', [address, 'latest']);
    return `${weiToEth(bal)} ETH (${chain.name})`;
  }

  if (tool === 'get_usdc_balance') {
    const address = args.address?.trim();
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Valid address=0x… required');
    }
    const usdc = USDC_BY_CHAIN[chain.chainId];
    if (!usdc) throw new Error(`USDC not configured for chain ${chain.chainId}`);
    const balHex = await rpc<string>('eth_call', [
      { to: usdc, data: `0x70a08231${padAddress(address)}` },
      'latest',
    ]);
    const raw = BigInt(balHex);
    const whole = raw / 1_000_000n;
    const frac = raw % 1_000_000n;
    const fracStr = frac.toString().padStart(6, '0').replace(/0+$/, '');
    const amount = fracStr ? `${whole}.${fracStr}` : whole.toString();
    return `${amount} USDC (${chain.name})`;
  }

  if (tool === 'get_token_balance') {
    const token = args.token?.trim();
    const holder = args.address?.trim();
    if (!token || !holder) throw new Error('token= and address= required');
    const balHex = await rpc<string>('eth_call', [
      { to: token, data: `0x70a08231${padAddress(holder)}` },
      'latest',
    ]);
    const decHex = await rpc<string>('eth_call', [{ to: token, data: '0x313ce567' }, 'latest']);
    const symHex = await rpc<string>('eth_call', [{ to: token, data: '0x95d89b41' }, 'latest']);
    const raw = BigInt(balHex);
    const decimals = Number(BigInt(decHex));
    const symbol = decodeString(symHex) || 'TOKEN';
    const divisor = 10n ** BigInt(decimals);
    const whole = raw / divisor;
    const frac = raw % divisor;
    const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
    const amount = fracStr ? `${whole}.${fracStr}` : whole.toString();
    return `${amount} ${symbol}`;
  }

  if (tool === 'b20_launch_guide') return B20_LAUNCH_GUIDE;
  if (tool === 'base_mcp_quickstart') return BASE_MCP_QUICKSTART_GUIDE;
  if (tool === 'bankr_x402_guide') return BANKR_X402_GUIDE;
  if (tool === 'x402_flow_guide') return X402_FLOW_GUIDE;
  if (tool === 'x402_mcp_guide') return X402_MCP_GUIDE;

  if (tool === 'send_transaction') {
    if (!process.env.WALLET_PRIVATE_KEY?.trim()) {
      return [
        'send_transaction needs WALLET_PRIVATE_KEY on this host.',
        'For agent sends: hyro login → hyro connect base → set key on VPS .env.prod → hyro run "…"',
        'For wallet writes (send USDC): use official Base MCP in Cursor (mcp.base.org).',
      ].join('\n');
    }
    return 'Local send requires @hyro/mcp-base on VPS. Use hyro connect base + hyro run when logged in.';
  }

  throw new Error(`Unknown base tool: ${tool}`);
}

export async function executeLocalDexscreenerTool(
  tool: string,
  args: Record<string, string>,
): Promise<string> {
  if (tool === 'search_pairs') {
    const query = args.query?.trim() || 'BRETT base';
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) throw new Error(`DexScreener ${res.status}`);
    const data = (await res.json()) as {
      pairs?: {
        chainId?: string;
        dexId?: string;
        pairAddress?: string;
        baseToken?: { symbol?: string };
        quoteToken?: { symbol?: string };
        priceUsd?: string;
        liquidity?: { usd?: number };
      }[];
    };
    const pairs = (data.pairs ?? [])
      .filter((p) => p.chainId === 'base' || p.chainId === 'basesepolia')
      .slice(0, 8);
    if (!pairs.length) return `No Base pairs for "${query}".`;
    return pairs
      .map((p) => {
        const sym = p.baseToken?.symbol ?? '?';
        const liq = p.liquidity?.usd ? `$${Math.round(p.liquidity.usd).toLocaleString()}` : '—';
        return `${sym}/${p.quoteToken?.symbol ?? '?'} · ${p.dexId} · $${p.priceUsd ?? '—'} · liq ${liq}\n  ${p.pairAddress}`;
      })
      .join('\n\n');
  }

  if (tool === 'get_pair') {
    const pairId = args.pairId?.trim();
    if (pairId?.includes('/')) {
      const [chainId, pairAddress] = pairId.split('/');
      const res = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`);
      const data = (await res.json()) as { pairs?: unknown[] };
      return JSON.stringify(data.pairs?.[0] ?? data, null, 2);
    }
    return executeLocalDexscreenerTool('search_pairs', { query: pairId || 'BRETT base' });
  }

  throw new Error(`Unknown dexscreener tool: ${tool}`);
}

export const LOCAL_BASE_TOOLS = [
  'get_chain_info',
  'get_balance',
  'get_usdc_balance',
  'get_token_balance',
  'b20_launch_guide',
  'base_mcp_quickstart',
  'bankr_x402_guide',
  'x402_flow_guide',
  'x402_mcp_guide',
  'send_transaction',
] as const;

export async function callLocalMcp(
  slug: 'base' | 'dexscreener',
  tool: string,
  args: Record<string, string>,
): Promise<string> {
  if (slug === 'base') return executeLocalBaseTool(tool, args);
  if (slug === 'dexscreener') return executeLocalDexscreenerTool(tool, args);
  throw new Error(`Local call not supported for slug "${slug}". Use: base, dexscreener`);
}
