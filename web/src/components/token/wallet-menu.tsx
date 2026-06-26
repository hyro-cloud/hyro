'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, LogOut, Wallet } from 'lucide-react';
import type { Address } from 'viem';
import { Button } from '@/components/ui/button';
import { getB20Network, type B20NetworkId } from '@/lib/b20/networks';
import { cn } from '@/lib/utils';

interface WalletMenuProps {
  account: Address | null;
  short: string | null;
  balance: string | null;
  balanceLoading: boolean;
  connecting: boolean;
  networkId: B20NetworkId;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefreshBalance: () => void;
}

export function WalletMenu({
  account,
  short,
  balance,
  balanceLoading,
  connecting,
  networkId,
  onConnect,
  onDisconnect,
  onRefreshBalance,
}: WalletMenuProps) {
  const network = getB20Network(networkId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    onRefreshBalance();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDoc);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open, onRefreshBalance]);

  if (!account) {
    return (
      <Button size="sm" onClick={onConnect} disabled={connecting}>
        {connecting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Wallet className="h-3.5 w-3.5" />
        )}
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="gap-1.5 font-mono"
      >
        <Wallet className="h-3.5 w-3.5 text-hyro-blue" />
        {short}
        <ChevronDown className={cn('h-3.5 w-3.5 text-hyro-dim transition', open && 'rotate-180')} />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-hyro-line/60 bg-hyro-panel shadow-[0_16px_48px_-12px_rgba(0,0,0,0.35)]"
        >
          <div className="border-b border-hyro-line/40 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-hyro-blue">
              {network.label}
            </p>
            <p className="mt-2 font-mono text-xl font-semibold text-hyro-ink">
              {balanceLoading ? (
                <span className="inline-flex items-center gap-2 text-sm text-hyro-dim">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading…
                </span>
              ) : balance !== null ? (
                <>
                  {balance} <span className="text-sm font-medium text-hyro-dim">ETH</span>
                </>
              ) : (
                <span className="text-sm text-hyro-dim">—</span>
              )}
            </p>
          </div>

          <div className="space-y-3 px-4 py-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-hyro-faint">
                Connected wallet
              </p>
              <a
                href={`${network.explorer}/address/${account}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block break-all font-mono text-[12px] text-hyro-mute hover:text-hyro-blue"
              >
                {account}
              </a>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 font-mono text-[12px]"
              onClick={() => {
                void onDisconnect();
                setOpen(false);
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Disconnect
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
