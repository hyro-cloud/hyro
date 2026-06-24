'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Address } from 'viem';
import { ensureBaseSepolia, getInjectedProvider } from '@/lib/b20/launch';
import type { Eip1193Provider } from '@/lib/b20/token-ops';

export function useB20Wallet() {
  const [account, setAccount] = useState<Address | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);

  useEffect(() => {
    const p = getInjectedProvider();
    setProvider(p);
    if (!p) return;

    const onAccounts = (accounts: unknown) => {
      const list = accounts as string[];
      setAccount(list[0] ? (list[0] as Address) : null);
    };

    p.request({ method: 'eth_accounts' })
      .then((accs) => onAccounts(accs))
      .catch(() => {});

    p.on?.('accountsChanged', onAccounts);
    return () => p.removeListener?.('accountsChanged', onAccounts);
  }, []);

  const connect = useCallback(async () => {
    const p = getInjectedProvider();
    if (!p) {
      setError('Install MetaMask or Coinbase Wallet');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      await ensureBaseSepolia(p);
      const accounts = (await p.request({ method: 'eth_requestAccounts' })) as string[];
      setAccount(accounts[0] as Address);
      setProvider(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const short = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : null;

  return { account, connect, connecting, error, provider, short };
}
