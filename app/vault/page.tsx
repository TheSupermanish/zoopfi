'use client';
/**
 * Earn — the Private DeFi hub on Stellar.
 *
 * Core: an ERC-4626-style yield vault (deposit assets → shares at the current
 * index; the index accrues yield, so your position grows). Reads (index, APY,
 * value) and writes (deposit/redeem) go through the Soroban contract.
 *
 * The thesis: every DeFi primitive, made private. Shielded Savings is live;
 * Private Lending and Private LP are the same shielded-pool machinery applied
 * to borrowing and liquidity. Hold your position as shielded notes → the index
 * (yield) stays public, your balance and gains stay yours.
 */
import { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/shell/AppShell';
import {
  TrendingUp, Loader2, AlertCircle, Check, ArrowUpRight, Lock, Coins,
  ShieldCheck, Sparkles, X,
} from 'lucide-react';
import { useWallet, getExplorerUrl, getAddressExplorerUrl, CONTRACTS } from '@/app/lib/chain';

const DECIMALS = 7;
const UNIT = 10 ** DECIMALS;
const toBase = (x: string) => BigInt(Math.round(Number(x) * UNIT));
const fromBase = (x: bigint | number | string) => Number(x) / UNIT;
const VAULT = CONTRACTS.yieldVault;

// Yield markets. Only the USDC vault is deployed on testnet today (live + real
// on-chain). The rest are upcoming markets — clearly flagged, never faked.
type Market = { id: string; asset: string; name: string; accent: string; apy: string; live: boolean };
const MARKETS: Market[] = [
  { id: 'usdc', asset: 'USDC', name: 'USDC Savings', accent: 'from-emerald-400 to-teal-600', apy: '8.0%', live: true },
  { id: 'xlm', asset: 'XLM', name: 'XLM Staking', accent: 'from-sky-400 to-indigo-600', apy: '6.2%', live: false },
  { id: 'eurc', asset: 'EURC', name: 'EURC Savings', accent: 'from-blue-400 to-cyan-600', apy: '5.4%', live: false },
  { id: 'btc', asset: 'BTC', name: 'BTC Vault', accent: 'from-amber-400 to-orange-600', apy: '3.1%', live: false },
];

export default function VaultPage() {
  const { ops, address, isConnected } = useWallet();
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [market, setMarket] = useState<string>('usdc');
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [apy, setApy] = useState<number | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [value, setValue] = useState<number>(0);
  const [shares, setShares] = useState<bigint>(BigInt(0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!VAULT) return;
    try {
      const [apyBps, idx] = await Promise.all([
        ops.viewContract(VAULT, 'apy_bps', []),
        ops.viewContract(VAULT, 'index', []),
      ]);
      setApy(Number(apyBps) / 100);
      setIndex(Number(idx) / 1e9);
      if (address) {
        const [v, s] = await Promise.all([
          ops.viewContract(VAULT, 'value_of', [address]),
          ops.viewContract(VAULT, 'shares_of', [address]),
        ]);
        setValue(fromBase((v as bigint) ?? 0));
        setShares(BigInt((s as bigint) ?? 0));
      }
    } catch (e) {
      console.warn('[vault] refresh', e);
    }
  }, [ops, address]);

  useEffect(() => { void refresh(); }, [refresh]);
  // Live index tick so the position visibly grows. Pause when the tab is hidden
  // so we don't spam the shared testnet RPC in the background.
  useEffect(() => {
    const t = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') void refresh();
    }, 15_000);
    return () => clearInterval(t);
  }, [refresh]);

  const onAction = async () => {
    const n = Number(amount);
    if (!VAULT || !address || !Number.isFinite(n) || n <= 0) {
      setError('Enter a valid amount and connect your wallet.');
      return;
    }
    setBusy(true); setError(null); setLastTx(null);
    try {
      let res;
      if (tab === 'deposit') {
        res = await ops.invokeContract(VAULT, 'deposit', [address, toBase(amount)]);
      } else {
        if (index == null) throw new Error('Price unavailable — try again in a moment.');
        const shareAmt = BigInt(Math.round((n * UNIT) / index));
        res = await ops.invokeContract(VAULT, 'redeem', [address, shareAmt]);
      }
      if (!res.success) throw new Error(res.error || 'Transaction failed');
      setLastTx(res.hash); setAmount('');
      await refresh();
    } catch (e) {
      setError((e as Error)?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const hasPosition = shares > BigInt(0);
  const projAnnual = apy != null && value > 0 ? (value * apy) / 100 : null;
  const projDaily = projAnnual != null ? projAnnual / 365 : null;
  const activeMarket = MARKETS.find((m) => m.id === market) ?? MARKETS[0];

  const openMarket = (id: string) => {
    setMarket(id); setTab('deposit'); setAmount(''); setError(null); setLastTx(null); setModalOpen(true);
  };

  return (
    <AppShell>
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute right-[-10%] top-[20%] h-[34rem] w-[34rem] rounded-full bg-[#7f13ec]/12 blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-10 sm:py-14">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/30 blur-2xl animate-pulse-glow" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/40">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="bg-gradient-to-r from-white via-emerald-100 to-[#c89bff] bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Private DeFi
          </h1>
          <p className="mt-3 max-w-md text-balance text-sm text-purple-200/70 sm:text-base">
            Earn on-chain yield on Stellar — then shield it. Every position, private by default.
          </p>
        </div>

        {/* Portfolio summary */}
        <div className="mt-9 flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 shadow-2xl shadow-black/40 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-purple-200/55">
              <Coins className="h-4 w-4" /> Your position
            </span>
            <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-white">
              {value.toFixed(4)} <span className="text-lg font-medium text-purple-200/45">USDC</span>
            </p>
            {hasPosition && projDaily != null ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-300/90">
                <Sparkles className="h-3.5 w-3.5" /> +{projDaily.toFixed(4)} USDC/day · grows every ledger
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-purple-200/45">Pick a market below to start earning.</p>
            )}
          </div>
          <div className="flex gap-6 sm:gap-8">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-purple-200/45">Best APY</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">{apy != null ? `${apy}%` : '8%'}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-purple-200/45">Status</p>
              <p className={`mt-1 flex items-center gap-1.5 text-2xl font-bold ${hasPosition ? 'text-emerald-300' : 'text-purple-200/55'}`}>
                <span className={`h-2 w-2 rounded-full ${hasPosition ? 'bg-emerald-400 animate-pulse' : 'bg-purple-300/40'}`} />
                {hasPosition ? 'Earning' : 'Idle'}
              </p>
            </div>
          </div>
        </div>

        {/* Markets grid */}
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-purple-100/80">Markets</h2>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {MARKETS.map((m) => (
              <div
                key={m.id}
                className={`group rounded-2xl border p-5 transition ${
                  m.live
                    ? 'border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] hover:-translate-y-0.5 hover:border-emerald-500/30'
                    : 'border-white/[0.06] bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${m.accent} text-sm font-bold text-white shadow-lg`}>
                    {m.asset.slice(0, 2)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${m.live ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.06] text-purple-200/50'}`}>
                    {m.live ? 'Live' : 'Soon'}
                  </span>
                </div>
                <p className="mt-3.5 font-semibold text-white">{m.name}</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabular-nums text-emerald-300">{m.apy}</span>
                  <span className="text-[11px] uppercase tracking-wide text-purple-200/45">APY</span>
                </div>
                <button
                  type="button"
                  disabled={!m.live}
                  onClick={() => openMarket(m.id)}
                  className={`mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition ${
                    m.live
                      ? 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white shadow-lg shadow-[#7f13ec]/25 hover:shadow-[#7f13ec]/50'
                      : 'cursor-not-allowed border border-white/10 bg-white/[0.03] text-purple-200/40'
                  }`}
                >
                  {m.live ? (hasPosition ? 'Manage' : 'Deposit') : 'Coming soon'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy note + verifier */}
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="flex max-w-lg items-start gap-2 text-xs text-purple-200/55">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b07bff]" />
            <span>The vault index (yield rate) is public on-chain; shield your shares and the amount you hold — and everything you earn — stays known only to you.</span>
          </p>
          {VAULT && (
            <a href={getAddressExplorerUrl(VAULT)} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-[#b07bff]/70 hover:text-[#b07bff]">
              vault {VAULT.slice(0, 6)}…{VAULT.slice(-4)} ↗
            </a>
          )}
        </div>
      </div>

      {/* Deposit / Withdraw modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => !busy && setModalOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#16121f] to-[#100b18] p-6 shadow-2xl shadow-black/60 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => !busy && setModalOpen(false)} aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-purple-200/50 transition hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>

            {/* Market header */}
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${activeMarket.accent} text-sm font-bold text-white shadow-lg`}>
                {activeMarket.asset.slice(0, 2)}
              </span>
              <div>
                <h2 className="font-bold text-white">{activeMarket.name}</h2>
                <p className="text-xs text-emerald-300">{apy != null ? `${apy}%` : activeMarket.apy} APY · auto-compounding</p>
              </div>
            </div>

            {/* Position mini-stats */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-black/25 p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-purple-200/45">Your position</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-white">{value.toFixed(4)} <span className="text-xs text-purple-200/45">USDC</span></p>
              </div>
              <div className="rounded-2xl bg-black/25 p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-purple-200/45">Price / share</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-white">{index != null ? index.toFixed(6) : '—'}</p>
              </div>
            </div>

            {/* Deposit / Withdraw tabs */}
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-black/30 p-1">
              {(['deposit', 'withdraw'] as const).map((t) => (
                <button key={t} onClick={() => { setTab(t); setError(null); }}
                  className={`rounded-xl py-2.5 text-sm font-semibold capitalize transition ${tab === t ? 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white shadow-lg shadow-[#7f13ec]/25' : 'text-purple-200/55 hover:text-purple-100'}`}>
                  {t}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-purple-200/55">Amount</label>
            <div className="mt-1.5 flex items-center rounded-2xl border border-white/10 bg-black/30 px-4 focus-within:border-[#9b3bff]/60">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus
                className="w-full bg-transparent py-3.5 text-xl font-semibold text-white outline-none placeholder:text-purple-200/30" />
              <span className="text-sm font-medium text-purple-200/40">USDC</span>
            </div>

            {!isConnected ? (
              <a href="/" className="mt-4 block w-full rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-3.5 text-center font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50">Connect wallet</a>
            ) : (
              <button onClick={onAction} disabled={busy || !amount || !VAULT}
                className="relative mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-3.5 font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition enabled:hover:shadow-[#7f13ec]/50 disabled:opacity-50">
                <span className="flex items-center gap-2">
                  {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Working…</> : (tab === 'deposit' ? 'Deposit & earn' : 'Withdraw')}
                </span>
                {busy && <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />}
              </button>
            )}

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300 animate-fade-in">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
              </div>
            )}
            {lastTx && (
              <a href={getExplorerUrl(lastTx)} target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-300 animate-fade-in">
                <Check className="h-4 w-4" /> Confirmed — view transaction <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}

            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-purple-200/45">
              <ShieldCheck className="h-3.5 w-3.5 text-[#b07bff]" /> Shield your shares anytime to keep your balance private.
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
