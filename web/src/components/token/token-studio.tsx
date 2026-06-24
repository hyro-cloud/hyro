'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Rocket,
  Wallet,
} from 'lucide-react';
import { parseUnits, type Address, type Hex } from 'viem';
import { Button } from '@/components/ui/button';
import { useB20Wallet } from '@/hooks/use-b20-wallet';
import { WalletMenu } from '@/components/token/wallet-menu';
import {
  EXPLORER,
  FAUCET_URL,
  SEPOLIA,
  buildLaunchArgs,
  randomSalt,
  type LaunchInputs,
} from '@/lib/b20/launch';
import { saveToken, tokensForDeployer, loadSavedTokens, type SavedB20Token } from '@/lib/b20/storage';
import {
  burnTokens,
  checkB20Activation,
  deployB20Token,
  listMintableTokens,
  mintTokens,
  predictTokenAddress,
  readTokenInfo,
  setPaused,
  variantFromKind,
  type ActivationStatus,
  type DeployResult,
} from '@/lib/b20/token-ops';
import { SITE } from '@/lib/content';
import { cn } from '@/lib/utils';

type Tab = 'create' | 'launched' | 'mine' | 'manage';
type StudioMode = 'deploy' | 'mint';

const TABS: { id: Tab; label: string }[] = [
  { id: 'create', label: 'Create' },
  { id: 'launched', label: 'New Launched' },
  { id: 'mine', label: 'My Tokens' },
  { id: 'manage', label: 'Manage' },
];

const DEFAULT_FORM: LaunchInputs = {
  variant: 'asset',
  name: 'My B20 Token',
  symbol: 'MYT',
  decimals: 18,
  currencyCode: 'USD',
  supply: '1000000',
  uncapped: true,
  supplyCap: '10000000',
  grantMintRole: true,
};

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function TokenStudio() {
  const {
    account,
    balance,
    balanceLoading,
    connect,
    connecting,
    disconnect,
    error: walletError,
    provider,
    refreshBalance,
    short,
  } = useB20Wallet();
  const [studioMode, setStudioMode] = useState<StudioMode>('deploy');
  const [tab, setTab] = useState<Tab>('create');
  const [activation, setActivation] = useState<ActivationStatus | null>(null);
  const [form, setForm] = useState<LaunchInputs>(DEFAULT_FORM);
  const [salt, setSalt] = useState<Hex>(() => randomSalt());
  const [preview, setPreview] = useState<string>('—');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [tokenListVersion, setTokenListVersion] = useState(0);
  const [selected, setSelected] = useState<SavedB20Token | null>(null);
  const [tokenInfo, setTokenInfo] = useState<Awaited<ReturnType<typeof readTokenInfo>> | null>(null);
  const [mintTo, setMintTo] = useState('');
  const [mintAmt, setMintAmt] = useState('');
  const [mintableTokens, setMintableTokens] = useState<SavedB20Token[]>([]);
  const [mintToken, setMintToken] = useState<SavedB20Token | null>(null);
  const [mintInfo, setMintInfo] = useState<Awaited<ReturnType<typeof readTokenInfo>> | null>(null);
  const [mintInfoLoading, setMintInfoLoading] = useState(false);
  const [loadingMintable, setLoadingMintable] = useState(false);
  const [burnAmt, setBurnAmt] = useState('100');
  const [deploySuccess, setDeploySuccess] = useState<(DeployResult & { name: string; symbol: string }) | null>(
    null,
  );
  const [mintSuccess, setMintSuccess] = useState<{
    txHash: Hex;
    amount: string;
    symbol: string;
    name: string;
    token: Address;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const refreshTokens = useCallback(() => {
    setTokenListVersion((v) => v + 1);
  }, []);

  const myTokens = useMemo(
    () => (account ? tokensForDeployer(account) : []),
    [account, tokenListVersion],
  );

  const launchedList = useMemo(() => loadSavedTokens(), [tokenListVersion]);

  const refreshMintable = useCallback(async () => {
    if (!account) {
      setMintableTokens([]);
      setMintToken(null);
      setMintInfo(null);
      return;
    }
    setLoadingMintable(true);
    try {
      const list = await listMintableTokens(account);
      setMintableTokens(list);
      setMintToken((prev) => {
        if (prev && list.some((t) => t.address.toLowerCase() === prev.address.toLowerCase())) {
          return prev;
        }
        return list[0] ?? null;
      });
    } catch (e) {
      setStatus((e as Error).message);
      setMintableTokens([]);
    } finally {
      setLoadingMintable(false);
    }
  }, [account]);

  useEffect(() => {
    if (studioMode === 'mint' && account) void refreshMintable();
  }, [studioMode, account, refreshMintable, tokenListVersion]);

  useEffect(() => {
    if (!mintToken || !account) {
      setMintInfo(null);
      setMintInfoLoading(false);
      return;
    }
    let cancelled = false;
    setMintInfoLoading(true);
    readTokenInfo(mintToken.address, account)
      .then((info) => {
        if (!cancelled) setMintInfo(info);
      })
      .catch(() => {
        if (!cancelled) setMintInfo(null);
      })
      .finally(() => {
        if (!cancelled) setMintInfoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mintToken, account, tokenListVersion]);

  useEffect(() => {
    checkB20Activation().then(setActivation).catch(() => setActivation({ asset: false, stablecoin: false }));
    refreshTokens();
  }, [refreshTokens]);

  const refreshPreview = useCallback(async () => {
    if (!account) {
      setPreview('—');
      return;
    }
    try {
      const variant = variantFromKind(form.variant);
      const addr = await predictTokenAddress(variant, account, salt);
      setPreview(addr);
    } catch {
      setPreview('—');
    }
  }, [account, form.variant, salt]);

  useEffect(() => {
    void refreshPreview();
  }, [refreshPreview]);

  const patch = (p: Partial<LaunchInputs>) => setForm((f) => ({ ...f, ...p }));

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setStatus('Copy failed');
    }
  };

  const deploy = async () => {
    if (!provider || !account) {
      await connect();
      return;
    }
    const active =
      form.variant === 'stablecoin' ? activation?.stablecoin : activation?.asset;
    if (activation && !active) {
      setStatus('B20 not activated on Sepolia yet — deploy may revert with FeatureNotActivated.');
    }
    setBusy(true);
    setDeploySuccess(null);
    setStatus('Confirm transaction in your wallet…');
    try {
      const result = await deployB20Token(provider, account, { ...form, salt });
      const saved: SavedB20Token = {
        id: crypto.randomUUID(),
        address: result.token,
        name: form.name,
        symbol: form.symbol,
        variant: form.variant,
        decimals: form.variant === 'stablecoin' ? 6 : form.decimals,
        deployer: account,
        txHash: result.txHash,
        salt: result.salt,
        chainId: SEPOLIA.id,
        createdAt: Date.now(),
      };
      saveToken(saved);
      refreshTokens();
      setSelected(saved);
      setSalt(randomSalt());
      setDeploySuccess({ ...result, name: form.name, symbol: form.symbol });
      setStatus(null);
      setTab('create');
    } catch (e) {
      setDeploySuccess(null);
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const loadManage = async (tok: SavedB20Token) => {
    setSelected(tok);
    setMintTo(account ?? tok.deployer);
    try {
      const info = await readTokenInfo(tok.address, account ?? undefined);
      setTokenInfo(info);
    } catch (e) {
      setTokenInfo(null);
      setStatus((e as Error).message);
    }
  };

  useEffect(() => {
    if (tab === 'manage' && selected) void loadManage(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selected?.address, account]);

  const doMintFromPanel = async () => {
    if (!provider || !account || !mintToken) return;
    setBusy(true);
    setMintSuccess(null);
    setStatus('Confirm mint in your wallet…');
    try {
      const info = mintInfo ?? (await readTokenInfo(mintToken.address, account));
      if (!info.canMint) {
        throw new Error('Your wallet does not have MINT_ROLE on this token.');
      }
      if (info.mintPaused) {
        throw new Error('Minting is paused on this token. Unpause MINT from the Manage tab.');
      }
      const amountStr = mintAmt || '0';
      const amt = parseUnits(amountStr, info.decimals);
      if (amt <= 0n) throw new Error('Enter an amount greater than 0.');
      const hash = await mintTokens(provider, account, mintToken.address, account, amt);
      setMintSuccess({
        txHash: hash,
        amount: amountStr,
        symbol: info.symbol,
        name: info.name,
        token: mintToken.address,
      });
      setStatus(null);
      setMintAmt('');
      await refreshMintable();
      const refreshed = await readTokenInfo(mintToken.address, account);
      setMintInfo(refreshed);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doMint = async () => {
    if (!provider || !account || !selected || !tokenInfo) return;
    setBusy(true);
    setMintSuccess(null);
    try {
      const amountStr = mintAmt;
      const amt = parseUnits(amountStr, tokenInfo.decimals);
      const to = (mintTo || account) as Address;
      const hash = await mintTokens(provider, account, selected.address, to, amt);
      setMintSuccess({
        txHash: hash,
        amount: amountStr,
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        token: selected.address,
      });
      setStatus(null);
      await loadManage(selected);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doBurn = async () => {
    if (!provider || !account || !selected || !tokenInfo) return;
    setBusy(true);
    try {
      const amt = parseUnits(burnAmt, tokenInfo.decimals);
      const hash = await burnTokens(provider, account, selected.address, amt);
      setStatus(`Burn tx: ${hash}`);
      await loadManage(selected);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doPause = async (pause: boolean) => {
    if (!provider || !account || !selected) return;
    setBusy(true);
    try {
      const hash = await setPaused(provider, account, selected.address, pause);
      setStatus(`${pause ? 'Pause' : 'Unpause'} tx: ${hash}`);
      await loadManage(selected);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const variantActive =
    form.variant === 'stablecoin' ? activation?.stablecoin : activation?.asset;

  return (
    <div className="min-h-screen bg-hyro-bg pt-20 pb-16">
      <div className="shell px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-hyro-line/50 pb-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-hyro-blue">
              HYRO Token Studio · Base Sepolia
            </p>
            <h1 className="mt-1 font-mono text-2xl font-semibold text-hyro-ink sm:text-3xl">
              Launch a B20 Token
            </h1>
            <p className="mt-2 max-w-xl text-sm text-hyro-dim">
              Deploy native Base B20 tokens via the factory precompile — role-gated, ERC-20 compatible.
              Per{' '}
              <a
                href={SITE.b20Docs}
                target="_blank"
                rel="noopener noreferrer"
                className="text-hyro-blue hover:underline"
              >
                Base B20 docs
              </a>
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider',
                variantActive
                  ? 'border-hyro-green/40 bg-hyro-green/10 text-hyro-green'
                  : 'border-hyro-orange/40 bg-hyro-orange/10 text-orange-400',
              )}
            >
              {activation === null
                ? 'Checking…'
                : variantActive
                  ? 'B20 live on Sepolia'
                  : 'B20 pending activation'}
            </span>
            <Button variant="outline" size="sm" asChild>
              <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
                Faucet
              </a>
            </Button>
            <WalletMenu
              account={account}
              short={short}
              balance={balance}
              balanceLoading={balanceLoading}
              connecting={connecting}
              onConnect={() => void connect()}
              onDisconnect={() => void disconnect()}
              onRefreshBalance={() => void refreshBalance()}
            />
          </div>
        </div>

        {walletError && (
          <p className="mb-4 rounded-lg border border-hyro-red/30 bg-hyro-red/10 px-4 py-2 font-mono text-[12px] text-hyro-red">
            {walletError}
          </p>
        )}
        {status && (
          <p className="mb-4 rounded-lg border border-hyro-blue/30 bg-hyro-blue/10 px-4 py-2 font-mono text-[12px] text-hyro-mute">
            {status}
          </p>
        )}

        {mintSuccess && (
          <div className="mb-6">
            <MintSuccessCard
              result={mintSuccess}
              copied={copied}
              onCopy={copyValue}
              onDismiss={() => setMintSuccess(null)}
            />
          </div>
        )}

        {/* Deploy / Mint — primary tabs (deployb20-style) */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-full border border-hyro-line/60 bg-hyro-panel/40 p-1">
            {(
              [
                { id: 'deploy' as const, label: 'Deploy B20' },
                { id: 'mint' as const, label: 'Mint Tokens' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setStudioMode(m.id);
                  setStatus(null);
                }}
                className={cn(
                  'rounded-full px-5 py-2 font-mono text-[12px] font-medium transition',
                  studioMode === m.id
                    ? 'bg-hyro-blue text-white shadow-sm'
                    : 'text-hyro-dim hover:text-hyro-ink',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {studioMode === 'mint' ? (
          <MintTokensPanel
            account={account}
            short={short}
            busy={busy}
            connecting={connecting}
            loading={loadingMintable}
            infoLoading={mintInfoLoading}
            tokens={mintableTokens}
            selected={mintToken}
            info={mintInfo}
            amount={mintAmt}
            onAmountChange={setMintAmt}
            onSelect={setMintToken}
            onConnect={() => void connect()}
            onRefresh={() => void refreshMintable()}
            onMint={() => void doMintFromPanel()}
            onGoDeploy={() => setStudioMode('deploy')}
          />
        ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar */}
          <aside className="lg:w-52 shrink-0">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-hyro-faint">Studio</p>
            <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'shrink-0 rounded-lg px-3 py-2 text-left font-mono text-[12px] transition',
                    tab === t.id
                      ? 'bg-hyro-blue/15 text-hyro-blue'
                      : 'text-hyro-dim hover:bg-hyro-panel/60 hover:text-hyro-ink',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="mt-6 hidden border-t border-hyro-line/40 pt-4 lg:block">
              <Link
                href="/playground"
                className="font-mono text-[11px] text-hyro-blue hover:underline"
              >
                Use in HYRO Playground →
              </Link>
            </div>
          </aside>

          {/* Main */}
          <div className="min-w-0 flex-1">
            {tab === 'create' && (
              <div className="space-y-6">
                {deploySuccess && (
                  <DeploySuccessCard
                    result={deploySuccess}
                    copied={copied}
                    onCopy={copyValue}
                    onManage={() => {
                      const saved = loadSavedTokens().find(
                        (t) => t.address.toLowerCase() === deploySuccess.token.toLowerCase(),
                      );
                      if (saved) {
                        setSelected(saved);
                        setTab('manage');
                        setStudioMode('deploy');
                      }
                    }}
                    onMint={() => {
                      const saved = loadSavedTokens().find(
                        (t) => t.address.toLowerCase() === deploySuccess.token.toLowerCase(),
                      );
                      if (saved) {
                        setMintToken(saved);
                        setStudioMode('mint');
                        setStatus(null);
                      }
                    }}
                    onDismiss={() => setDeploySuccess(null)}
                  />
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {(['asset', 'stablecoin'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => patch({ variant: v })}
                      className={cn(
                        'rounded-xl border p-4 text-left transition',
                        form.variant === v
                          ? 'border-hyro-blue/60 bg-hyro-blue/10'
                          : 'border-hyro-line/60 bg-hyro-panel/20 hover:border-hyro-blue/30',
                      )}
                    >
                      <p className="font-mono text-[13px] font-medium capitalize text-hyro-ink">{v}</p>
                      <p className="mt-1 text-[11px] text-hyro-dim">
                        {v === 'asset'
                          ? '6–18 decimals, supply cap, batched mint.'
                          : 'Fixed 6 decimals, ISO currency code.'}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Token name">
                    <input
                      value={form.name}
                      onChange={(e) => patch({ name: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Symbol">
                    <input
                      value={form.symbol}
                      onChange={(e) => patch({ symbol: e.target.value.toUpperCase() })}
                      className={inputCls}
                    />
                  </Field>
                  {form.variant === 'asset' ? (
                    <Field label="Decimals">
                      <select
                        value={form.decimals}
                        onChange={(e) => patch({ decimals: Number(e.target.value) })}
                        className={inputCls}
                      >
                        {[6, 8, 12, 18].map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <Field label="Currency code">
                      <input
                        value={form.currencyCode}
                        onChange={(e) => patch({ currencyCode: e.target.value.toUpperCase() })}
                        maxLength={3}
                        className={inputCls}
                      />
                    </Field>
                  )}
                  <Field label="Initial mint (to admin)">
                    <input
                      value={form.supply}
                      onChange={(e) => patch({ supply: e.target.value })}
                      className={inputCls}
                      placeholder="1000000"
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <label className="flex items-center gap-2 font-mono text-[12px] text-hyro-mute">
                    <input
                      type="checkbox"
                      checked={form.grantMintRole}
                      onChange={(e) => patch({ grantMintRole: e.target.checked })}
                      className="rounded border-hyro-line"
                    />
                    Grant myself MINT_ROLE?
                  </label>
                  <label className="flex items-center gap-2 font-mono text-[12px] text-hyro-mute">
                    <input
                      type="checkbox"
                      checked={form.uncapped}
                      onChange={(e) => patch({ uncapped: e.target.checked })}
                      className="rounded border-hyro-line"
                    />
                    No supply cap?
                  </label>
                  {!form.uncapped && (
                    <Field label="Supply cap" className="min-w-[160px] flex-1">
                      <input
                        value={form.supplyCap}
                        onChange={(e) => patch({ supplyCap: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                  )}
                </div>

                <details className="rounded-xl border border-dashed border-hyro-line/40 bg-hyro-bg/30">
                  <summary className="cursor-pointer px-4 py-3 font-mono text-[11px] text-hyro-dim hover:text-hyro-ink">
                    Advanced · deterministic address preview
                  </summary>
                  <div className="border-t border-hyro-line/40 px-4 pb-4 pt-2">
                    <p className="mb-3 text-[11px] leading-relaxed text-hyro-faint">
                      Alamat kontrak dihitung dari <span className="text-hyro-dim">salt + wallet + variant</span>{' '}
                      sebelum deploy (CREATE2). Berguna untuk verifikasi alamat sebelum kirim tx — tidak wajib
                      dibuka.
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-[10px] text-hyro-dim">Predicted address</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSalt(randomSalt());
                          void refreshPreview();
                        }}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-hyro-blue"
                      >
                        <RefreshCw className="h-3 w-3" />
                        New salt
                      </button>
                    </div>
                    <p className="mt-2 break-all font-mono text-[13px] text-hyro-blue">{preview}</p>
                  </div>
                </details>

                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={busy || !form.name || !form.symbol}
                  onClick={() => void deploy()}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="h-4 w-4" />
                  )}
                  Deploy B20 Token
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <p className="font-mono text-[10px] text-hyro-faint">
                  Base Sepolia · factory{' '}
                  <span className="text-hyro-dim">0xB20f…0000</span> ·{' '}
                  <a href={SITE.b20Docs} target="_blank" rel="noopener noreferrer" className="text-hyro-blue hover:underline">
                    B20 docs
                  </a>
                </p>
              </div>
            )}

            {tab === 'launched' && (
              <TokenList
                empty="No B20 tokens launched yet — deploy from Create."
                items={launchedList}
                onSelect={(t) => {
                  setSelected(t);
                  setTab('manage');
                }}
              />
            )}

            {tab === 'mine' && (
              <TokenList
                empty={
                  account
                    ? 'No tokens for this wallet yet.'
                    : 'Connect wallet to see your deployments.'
                }
                items={myTokens}
                onSelect={(t) => {
                  setSelected(t);
                  setTab('manage');
                }}
              />
            )}

            {tab === 'manage' && (
              <div className="space-y-4">
                {!selected ? (
                  <p className="text-sm text-hyro-dim">Select a token from My Tokens or New Launched.</p>
                ) : (
                  <>
                    <div className="rounded-xl border border-hyro-line/60 bg-hyro-panel/30 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-lg font-semibold text-hyro-ink">
                            {tokenInfo?.name ?? selected.name}
                          </p>
                          <p className="font-mono text-[12px] text-hyro-blue">
                            {tokenInfo?.symbol ?? selected.symbol} · {shortAddr(selected.address)}
                          </p>
                        </div>
                        <a
                          href={`${EXPLORER}/address/${selected.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-hyro-dim hover:text-hyro-blue"
                        >
                          Explorer <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      {tokenInfo && (
                        <dl className="mt-4 grid gap-2 sm:grid-cols-2 font-mono text-[12px]">
                          <div>
                            <dt className="text-hyro-faint">Supply</dt>
                            <dd className="text-hyro-mute">{tokenInfo.totalSupply}</dd>
                          </div>
                          <div>
                            <dt className="text-hyro-faint">Decimals</dt>
                            <dd className="text-hyro-mute">{tokenInfo.decimals}</dd>
                          </div>
                          <div>
                            <dt className="text-hyro-faint">Pause state</dt>
                            <dd className="text-hyro-mute">
                              {tokenInfo.mintPaused || tokenInfo.transferPaused || tokenInfo.burnPaused
                                ? [
                                    tokenInfo.transferPaused && 'transfer',
                                    tokenInfo.mintPaused && 'mint',
                                    tokenInfo.burnPaused && 'burn',
                                  ]
                                    .filter(Boolean)
                                    .join(', ')
                                : 'none'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-hyro-faint">You can mint</dt>
                            <dd className="text-hyro-mute">{tokenInfo.canMint ? 'Yes' : 'No'}</dd>
                          </div>
                        </dl>
                      )}
                      <div className="mt-4 space-y-2 border-t border-hyro-line/40 pt-4 font-mono text-[11px]">
                        <CopyRow label="Contract" value={selected.address} explorer={`${EXPLORER}/address/${selected.address}`} />
                        <CopyRow label="Deploy tx" value={selected.txHash} explorer={`${EXPLORER}/tx/${selected.txHash}`} />
                      </div>
                    </div>

                    {!account ? (
                      <Button onClick={() => void connect()}>Connect wallet to manage</Button>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-hyro-line/60 p-4">
                          <p className="mb-3 font-mono text-[11px] uppercase text-hyro-dim">Mint</p>
                          <input
                            value={mintTo}
                            onChange={(e) => setMintTo(e.target.value)}
                            placeholder="Recipient 0x…"
                            className={cn(inputCls, 'mb-2')}
                          />
                          <input
                            value={mintAmt}
                            onChange={(e) => setMintAmt(e.target.value)}
                            placeholder="Amount"
                            className={cn(inputCls, 'mb-3')}
                          />
                          <Button size="sm" disabled={busy} onClick={() => void doMint()}>
                            Mint
                          </Button>
                        </div>
                        <div className="rounded-xl border border-hyro-line/60 p-4">
                          <p className="mb-3 font-mono text-[11px] uppercase text-hyro-dim">Burn / Pause</p>
                          <input
                            value={burnAmt}
                            onChange={(e) => setBurnAmt(e.target.value)}
                            placeholder="Burn amount"
                            className={cn(inputCls, 'mb-3')}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => void doBurn()}>
                              Burn
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => void doPause(true)}>
                              Pause
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => void doPause(false)}>
                              Unpause
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-hyro-faint">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-hyro-line/60 bg-hyro-bg/60 px-3 py-2 font-mono text-[13px] text-hyro-ink outline-none focus:border-hyro-blue/50';

function MintSuccessCard({
  result,
  copied,
  onCopy,
  onDismiss,
}: {
  result: { txHash: Hex; amount: string; symbol: string; name: string; token: Address };
  copied: string | null;
  onCopy: (key: string, value: string) => void;
  onDismiss: () => void;
}) {
  const explorerTxUrl = `${EXPLORER}/tx/${result.txHash}`;
  const explorerTokenUrl = `${EXPLORER}/address/${result.token}`;

  return (
    <div className="rounded-xl border border-hyro-green/40 bg-hyro-green/[0.08] p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hyro-green/20 text-hyro-green">
          <Check className="h-5 w-5" />
        </span>
        <div>
          <p className="font-mono text-[13px] font-semibold text-hyro-green">Mint successful on Base Sepolia</p>
          <p className="mt-0.5 font-mono text-[12px] text-hyro-mute">
            {result.amount} <span className="text-hyro-blue">{result.symbol}</span> → {result.name}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-hyro-line/50 bg-hyro-bg/50 p-4">
        <ResultRow
          label="Transaction hash"
          value={result.txHash}
          explorer={explorerTxUrl}
          copyKey="mint-tx"
          copied={copied}
          onCopy={onCopy}
        />
        <ResultRow
          label="Token contract"
          value={result.token}
          explorer={explorerTokenUrl}
          copyKey="mint-token"
          copied={copied}
          onCopy={onCopy}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <a href={explorerTxUrl} target="_blank" rel="noopener noreferrer">
            View on BaseScan <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

function DeploySuccessCard({
  result,
  copied,
  onCopy,
  onManage,
  onMint,
  onDismiss,
}: {
  result: DeployResult & { name: string; symbol: string };
  copied: string | null;
  onCopy: (key: string, value: string) => void;
  onManage: () => void;
  onMint: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-hyro-green/40 bg-hyro-green/[0.08] p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hyro-green/20 text-hyro-green">
          <Check className="h-5 w-5" />
        </span>
        <div>
          <p className="font-mono text-[13px] font-semibold text-hyro-green">Token deployed on Base Sepolia</p>
          <p className="mt-0.5 font-mono text-[12px] text-hyro-mute">
            {result.name} <span className="text-hyro-blue">({result.symbol})</span> · block {result.blockNumber.toString()}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-hyro-line/50 bg-hyro-bg/50 p-4">
        <ResultRow
          label="Contract address"
          value={result.token}
          explorer={result.explorerTokenUrl}
          copyKey="token"
          copied={copied}
          onCopy={onCopy}
        />
        <ResultRow
          label="Transaction hash"
          value={result.txHash}
          explorer={result.explorerTxUrl}
          copyKey="tx"
          copied={copied}
          onCopy={onCopy}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={onManage}>
          Manage token
        </Button>
        <Button size="sm" variant="outline" onClick={onMint}>
          Mint supply
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={result.explorerTokenUrl} target="_blank" rel="noopener noreferrer">
            View on BaseScan <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Deploy another
        </Button>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  explorer,
  copyKey,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  explorer: string;
  copyKey: string;
  copied: string | null;
  onCopy: (key: string, value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-hyro-faint">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="break-all font-mono text-[12px] text-hyro-blue">{value}</code>
        <button
          type="button"
          onClick={() => void onCopy(copyKey, value)}
          className="inline-flex items-center gap-1 rounded border border-hyro-line/60 px-2 py-0.5 font-mono text-[10px] text-hyro-dim hover:text-hyro-blue"
        >
          {copied === copyKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied === copyKey ? 'Copied' : 'Copy'}
        </button>
        <a
          href={explorer}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-[10px] text-hyro-dim hover:text-hyro-blue"
        >
          Explorer <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function CopyRow({ label, value, explorer }: { label: string; value: string; explorer: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-hyro-faint">{label}</span>
      <div className="flex items-center gap-2">
        <code className="break-all text-hyro-mute">{shortAddr(value)}</code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(value);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }}
          className="text-hyro-dim hover:text-hyro-blue"
          aria-label={`Copy ${label}`}
        >
          {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
        <a href={explorer} target="_blank" rel="noopener noreferrer" className="text-hyro-blue hover:underline">
          scan
        </a>
      </div>
    </div>
  );
}

function MintTokensPanel({
  account,
  short,
  busy,
  connecting,
  loading,
  infoLoading,
  tokens,
  selected,
  info,
  amount,
  onAmountChange,
  onSelect,
  onConnect,
  onRefresh,
  onMint,
  onGoDeploy,
}: {
  account: Address | null;
  short: string | null;
  busy: boolean;
  connecting: boolean;
  loading: boolean;
  infoLoading: boolean;
  tokens: SavedB20Token[];
  selected: SavedB20Token | null;
  info: Awaited<ReturnType<typeof readTokenInfo>> | null;
  amount: string;
  onAmountChange: (v: string) => void;
  onSelect: (t: SavedB20Token) => void;
  onConnect: () => void;
  onRefresh: () => void;
  onMint: () => void;
  onGoDeploy: () => void;
}) {
  const [faqOpen, setFaqOpen] = useState<string | null>(null);

  const capLabel = info
    ? info.uncapped
      ? 'no supply cap'
      : `cap ${info.supplyCap}`
    : '';

  const amountOk = amount.trim().length > 0 && !Number.isNaN(Number(amount.replace(/,/g, '')));
  const mintBlocked = info?.canMint === false || info?.mintPaused === true;
  const mintDisabled = busy || !selected || !amountOk || mintBlocked || infoLoading;

  let mintHint = '';
  if (!selected) mintHint = 'Select a token first.';
  else if (infoLoading) mintHint = 'Loading token details…';
  else if (mintBlocked) mintHint = 'Wallet lacks MINT_ROLE — redeploy with “Grant myself MINT_ROLE”.';
  else if (!amountOk) mintHint = 'Enter an amount.';
  else if (info?.mintPaused) mintHint = 'Minting is paused on this token — unpause from Manage tab.';

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h2 className="font-mono text-xl font-semibold text-hyro-ink">Mint Deployed B20 Tokens</h2>
            <p className="mt-1 text-sm text-hyro-dim">Issue more supply for a token you control.</p>
          </div>
          <div className="space-y-3 text-sm text-hyro-mute">
            <div>
              <p className="font-mono text-[12px] font-medium text-hyro-ink">What is minting?</p>
              <p className="mt-1 text-hyro-dim">
                Minting issues new token supply directly to your wallet. It calls the token&apos;s{' '}
                <code className="text-hyro-blue">mint</code> function — separate from deployment.
              </p>
            </div>
            <div>
              <p className="font-mono text-[12px] font-medium text-hyro-ink">Why use it?</p>
              <p className="mt-1 text-hyro-dim">
                Deployment only sets up the token and supply cap. Minting puts tokens into circulation when you
                need more supply later.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-hyro-line/60 bg-hyro-panel/30 p-5">
          {!account ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-hyro-dim">Connect your wallet to see B20 tokens you can mint.</p>
              <Button onClick={onConnect} disabled={connecting}>
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                Connect Wallet
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-hyro-dim">
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning wallet for mintable B20 tokens…
            </div>
          ) : tokens.length === 0 ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-hyro-dim">
                No mintable B20 tokens found for <span className="font-mono text-hyro-blue">{short}</span>.
                Deploy one first and grant yourself <span className="font-mono">MINT_ROLE</span>.
              </p>
              <Button variant="outline" onClick={onGoDeploy}>
                Deploy B20 Token
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Field label="Token">
                  <select
                    value={selected?.address ?? ''}
                    onChange={(e) => {
                      const tok = tokens.find((t) => t.address === e.target.value);
                      if (tok) onSelect(tok);
                    }}
                    className={inputCls}
                  >
                    {tokens.map((t) => (
                      <option key={t.address} value={t.address}>
                        {t.symbol} — {shortAddr(t.address)}
                      </option>
                    ))}
                  </select>
                </Field>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="mt-5 shrink-0 rounded-lg border border-hyro-line/60 p-2 text-hyro-dim hover:text-hyro-blue"
                  aria-label="Refresh tokens"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {selected && infoLoading && (
                <p className="flex items-center gap-2 font-mono text-[11px] text-hyro-dim">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading {selected.symbol} on-chain…
                </p>
              )}

              {selected && info && (
                <div className="rounded-lg border border-hyro-line/40 bg-hyro-bg/40 px-3 py-2">
                  <p className="font-mono text-[13px] text-hyro-ink">
                    {info.name} ({info.symbol})
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-hyro-dim">
                    Minted so far: {info.totalSupply}
                    {capLabel ? ` (${capLabel})` : ''}
                  </p>
                  {!info.canMint && (
                    <p className="mt-1 font-mono text-[11px] text-hyro-orange">
                      No MINT_ROLE on this wallet.
                    </p>
                  )}
                </div>
              )}

              <Field label="Amount">
                <input
                  value={amount}
                  onChange={(e) => onAmountChange(e.target.value)}
                  placeholder="0.0"
                  className={inputCls}
                />
              </Field>

              <p className="font-mono text-[10px] text-hyro-faint">
                Mints to your wallet ({short}) · Base Sepolia
              </p>

              <div className="pt-1">
                <Button
                  className="w-full shadow-[0_8px_24px_-10px_rgba(59,140,255,0.45)]"
                  size="lg"
                  disabled={mintDisabled}
                  onClick={onMint}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Mint to wallet
                </Button>
                {mintHint && (
                  <p className="mt-2 text-center font-mono text-[10px] text-hyro-dim">{mintHint}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-hyro-line/40 pt-6">
        {[
          {
            id: 'b20',
            q: 'What is B20?',
            a: 'B20 is Base’s native token standard — role-gated ERC-20 tokens deployed via the B20 factory precompile.',
          },
          {
            id: 'mint-role',
            q: 'What is Grant myself MINT_ROLE?',
            a: 'During deploy, you can grant your wallet permission to mint more supply later. Required for this tab to work.',
          },
          {
            id: 'cap',
            q: 'What is a supply cap?',
            a: 'The maximum total supply the token can ever reach. Uncapped tokens use the protocol maximum.',
          },
        ].map((item) => (
          <div key={item.id} className="rounded-lg border border-hyro-line/50">
            <button
              type="button"
              onClick={() => setFaqOpen(faqOpen === item.id ? null : item.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left font-mono text-[12px] text-hyro-ink"
            >
              {item.q}
              <span className="text-hyro-dim">{faqOpen === item.id ? '−' : '+'}</span>
            </button>
            {faqOpen === item.id && (
              <p className="border-t border-hyro-line/40 px-4 py-3 text-[12px] text-hyro-dim">{item.a}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TokenList({
  items,
  empty,
  onSelect,
}: {
  items: SavedB20Token[];
  empty: string;
  onSelect: (t: SavedB20Token) => void;
}) {
  if (!items.length) {
    return <p className="text-sm text-hyro-dim">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => onSelect(t)}
            className="flex w-full items-center justify-between rounded-xl border border-hyro-line/60 bg-hyro-panel/30 px-4 py-3 text-left transition hover:border-hyro-blue/40"
          >
            <div>
              <p className="font-mono text-[13px] font-medium text-hyro-ink">
                {t.name}{' '}
                <span className="text-hyro-blue">{t.symbol}</span>
              </p>
              <p className="font-mono text-[10px] text-hyro-faint">
                {t.address} · tx {shortAddr(t.txHash)}
              </p>
              <p className="font-mono text-[10px] text-hyro-dim">
                {t.variant} · {new Date(t.createdAt).toLocaleString()}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-hyro-dim" />
          </button>
        </li>
      ))}
    </ul>
  );
}
