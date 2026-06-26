'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatEther, type Address } from 'viem';
import { ensureB20Network, getInjectedProvider, publicClient } from '@/lib/b20/launch';
import type { B20NetworkId } from '@/lib/b20/networks';
import { getB20Network } from '@/lib/b20/networks';
import type { Eip1193Provider } from '@/lib/b20/token-ops';

const DISCONNECT_KEY = 'hyro.wallet.disconnected';

function isManuallyDisconnected(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DISCONNECT_KEY) === '1';
  } catch {
    return false;
  }
}

function setManuallyDisconnected(disconnected: boolean) {
  try {
    if (disconnected) sessionStorage.setItem(DISCONNECT_KEY, '1');
    else sessionStorage.removeItem(DISCONNECT_KEY);
  } catch {
    // sessionStorage unavailable — ignore
  }
}

export function useB20Wallet(networkId: B20NetworkId) {
  const network = getB20Network(networkId);
  const [account, setAccount] = useState<Address | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);
  const [balanceWei, setBalanceWei] = useState<bigint | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    const p = getInjectedProvider();
    setProvider(p);
    if (!p) return;

    const onAccounts = (accounts: unknown) => {
      if (isManuallyDisconnected()) return;
      const list = accounts as string[];
      setAccount(list[0] ? (list[0] as Address) : null);
    };

    if (!isManuallyDisconnected()) {
      p.request({ method: 'eth_accounts' })
        .then((accs) => onAccounts(accs))
        .catch(() => {});
    }

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
    setManuallyDisconnected(false);
    try {
      await ensureB20Network(p, networkId);
      const accounts = (await p.request({ method: 'eth_requestAccounts' })) as string[];
      setAccount(accounts[0] as Address);
      setProvider(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }, [networkId]);

  const refreshBalance = useCallback(async () => {
    if (!account) {
      setBalanceWei(null);
      return;
    }
    setBalanceLoading(true);
    try {
      const wei = await publicClient(networkId).getBalance({ address: account });
      setBalanceWei(wei);
    } catch {
      setBalanceWei(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [account, networkId]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  const disconnect = useCallback(async () => {
    const p = provider ?? getInjectedProvider();
    if (p) {
      try {
        await p.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        });
      } catch {
        // Wallet may not support revoke — still clear local session.
      }
    }
    setAccount(null);
    setBalanceWei(null);
    setError(null);
    setManuallyDisconnected(true);
  }, [provider]);

  const short = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : null;
  const balance =
    balanceWei === null
      ? null
      : Number.parseFloat(formatEther(balanceWei)).toLocaleString(undefined, {
          maximumFractionDigits: 6,
        });

  return {
    account,
    balance,
    balanceLoading,
    connect,
    connecting,
    disconnect,
    error,
    network,
    provider,
    refreshBalance,
    short,
  };
}
