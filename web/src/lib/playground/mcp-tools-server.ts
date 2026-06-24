/**
 * Server-side MCP tool execution for playground (Base RPC + DexScreener HTTP).
 * Mirrors packages/mcp-base without viem dependency in the web bundle.
 */

const B20_LAUNCH_GUIDE = `B20 token launch on Base (summary):

1. Install Base Foundry: base-foundryup (use base-forge / base-cast).
2. Network: Base Sepolia https://sepolia.base.org (84532) or mainnet https://mainnet.base.org (8453).
3. Call B20 Factory precompile createB20 via B20FactoryLib.
4. Factory addresses start with 0xB20f…; minted tokens start with 0xB200….
5. B20 tokens are full ERC-20 — use get_token_balance for balances.

Docs: https://docs.base.org/get-started/launch-b20-token`;

function rpcUrl(): string {
  return process.env.BASE_RPC_URL?.trim() || 'https://mainnet.base.org';
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

export async function executeBaseTool(
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
        b20Docs: 'https://docs.base.org/get-started/launch-b20-token',
      },
      null,
      2,
    );
  }

  if (tool === 'get_balance') {
    const address = args.address?.trim();
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Valid address (0x…) required');
    }
    const bal = await rpc<string>('eth_getBalance', [address, 'latest']);
    return `${weiToEth(bal)} ETH (${chain.name})`;
  }

  if (tool === 'get_token_balance') {
    const token = args.token?.trim();
    const holder = args.address?.trim();
    if (!token || !holder) throw new Error('token and address required');
    const balHex = await rpc<string>('eth_call', [
      { to: token, data: `0x70a08231${padAddress(holder)}` },
      'latest',
    ]);
    const decHex = await rpc<string>('eth_call', [
      { to: token, data: '0x313ce567' },
      'latest',
    ]);
    const symHex = await rpc<string>('eth_call', [
      { to: token, data: '0x95d89b41' },
      'latest',
    ]);
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

  if (tool === 'send_transaction') {
    if (!process.env.WALLET_PRIVATE_KEY?.trim()) {
      return 'WALLET_PRIVATE_KEY is not set on the playground host. Configure it in web .env.local (or VPS) to send txs. Agent only prepares — you sign every tx.';
    }
    return 'send_transaction requires viem on VPS MCP host. Use `hyro` CLI with `connect base` for live sends.';
  }

  throw new Error(`Unknown base tool: ${tool}`);
}

export async function executeDexscreenerTool(
  tool: string,
  args: Record<string, string>,
): Promise<string> {
  if (tool === 'search_pairs') {
    const query = args.query?.trim() || 'BRETT base';
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
      { next: { revalidate: 30 } },
    );
    if (!res.ok) throw new Error(`DexScreener ${res.status}`);
    const data = (await res.json()) as {
      pairs?: {
        chainId?: string;
        dexId?: string;
        pairAddress?: string;
        baseToken?: { symbol?: string; name?: string; address?: string };
        quoteToken?: { symbol?: string };
        priceUsd?: string;
        liquidity?: { usd?: number };
        volume?: { h24?: number };
        priceChange?: { h24?: number };
      }[];
    };
    const pairs = (data.pairs ?? [])
      .filter((p) => p.chainId === 'base' || p.chainId === 'basesepolia')
      .slice(0, 8);
    if (!pairs.length) return `No Base pairs found for "${query}".`;
    return pairs
      .map((p) => {
        const sym = p.baseToken?.symbol ?? '?';
        const price = p.priceUsd ?? '—';
        const liq = p.liquidity?.usd ? `$${Math.round(p.liquidity.usd).toLocaleString()}` : '—';
        const vol = p.volume?.h24 ? `$${Math.round(p.volume.h24).toLocaleString()}` : '—';
        const ch = p.priceChange?.h24 != null ? `${p.priceChange.h24.toFixed(2)}%` : '—';
        return `${sym}/${p.quoteToken?.symbol ?? '?'} · ${p.dexId} · $${price} · liq ${liq} · 24h vol ${vol} · 24h ${ch}\n  ${p.pairAddress} (${p.chainId})`;
      })
      .join('\n\n');
  }

  if (tool === 'get_pair') {
    const pairId = args.pairId?.trim();
    if (pairId && pairId.includes('/')) {
      const [chainId, pairAddress] = pairId.split('/');
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`,
      );
      const data = (await res.json()) as { pairs?: unknown[] };
      return JSON.stringify(data.pairs?.[0] ?? data, null, 2);
    }
    return executeDexscreenerTool('search_pairs', { query: pairId || 'BRETT base' });
  }

  throw new Error(`Unknown dexscreener tool: ${tool}`);
}
