'use client';
/**
 * Yield Vault — DeFi savings on Stellar.
 *
 * ERC-4626-style share vault: deposit assets → shares at the current index;
 * the index accrues yield over time, so your position grows. Reads (index, APY,
 * your value) and writes (deposit/withdraw) go through the Soroban contract.
 *
 * Privacy: hold your vault shares as shielded notes for *private yield* — the
 * index is public, your share count (and balance/gains) stays hidden. Roadmap.
 */
import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { TrendingUp, Loader2, AlertCircle, Check, ArrowUpRight, Lock } from 'lucide-react';
import { useWallet, getExplorerUrl, CONTRACTS } from '@/app/lib/chain';

const DECIMALS = 7;
const UNIT = 10 ** DECIMALS;
const toBase = (x: string) => BigInt(Math.round(Number(x) * UNIT));
const fromBase = (x: bigint | number | string) => Number(x) / UNIT;
const VAULT = CONTRACTS.yieldVault;

export default function VaultPage() {
  const { ops, address, isConnected } = useWallet();
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
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
  // Live index tick so the position visibly grows.
  useEffect(() => {
    const t = setInterval(refresh, 12_000);
    return () => clearInterval(t);
  }, [refresh]);

  const onAction = async () => {
    if (!VAULT || !amount) return;
    setBusy(true); setError(null); setLastTx(null);
    try {
      let res;
      if (tab === 'deposit') {
        res = await ops.invokeContract(VAULT, 'deposit', [address, toBase(amount)]);
      } else {
        // Withdraw by share amount (approximate from asset amount at current index).
        const idx = index ?? 1;
        const shareAmt = BigInt(Math.round((Number(amount) * UNIT) / idx));
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

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Yield Vault</h1>
            <p className="text-sm text-slate-500 dark:text-[#ad92c9]">Earn on-chain yield on Stellar</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 dark:border-[#4d3267] bg-white dark:bg-[#261933] p-4">
            <p className="text-xs text-slate-500 dark:text-[#ad92c9]">APY</p>
            <p className="text-2xl font-bold text-emerald-500">{apy != null ? `${apy}%` : '—'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-[#4d3267] bg-white dark:bg-[#261933] p-4">
            <p className="text-xs text-slate-500 dark:text-[#ad92c9]">Price / share</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{index != null ? index.toFixed(6) : '—'}</p>
          </div>
        </div>

        {/* Position */}
        {isConnected && (
          <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs text-slate-500 dark:text-[#ad92c9]">Your position</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{value.toFixed(4)} <span className="text-base text-slate-400">USDC</span></p>
            <p className="text-xs text-emerald-500">{shares > BigInt(0) ? 'Earning yield — grows every ledger' : 'No deposit yet'}</p>
          </div>
        )}

        {/* Action */}
        <div className="mt-4 rounded-3xl border border-slate-200 dark:border-[#4d3267] bg-white dark:bg-[#261933] p-5">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-[#1a1122] p-1">
            {(['deposit', 'withdraw'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-lg py-2 text-sm font-medium capitalize transition ${tab === t ? 'bg-white dark:bg-[#362348] text-slate-900 dark:text-white shadow' : 'text-slate-500 dark:text-[#ad92c9]'}`}>
                {t}
              </button>
            ))}
          </div>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
            className="w-full rounded-xl bg-slate-50 dark:bg-[#1a1122] border border-slate-200 dark:border-[#4d3267] px-4 py-3 text-xl font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500" />

          {!isConnected ? (
            <a href="/" className="mt-3 block w-full rounded-xl bg-emerald-500 py-3.5 text-center font-semibold text-white">Connect wallet</a>
          ) : (
            <button onClick={onAction} disabled={busy || !amount || !VAULT}
              className="mt-3 w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 py-3.5 font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Working…</> : (tab === 'deposit' ? 'Deposit & earn' : 'Withdraw')}
            </button>
          )}

          {!VAULT && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Vault contract not configured.</p>}
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          )}
          {lastTx && (
            <a href={getExplorerUrl(lastTx)} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Confirmed — view transaction <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#7f13ec]/20 bg-[#7f13ec]/5 p-3 text-xs text-slate-600 dark:text-[#ad92c9]">
          <Lock className="h-4 w-4 shrink-0 text-[#7f13ec]" />
          <span><b className="text-[#7f13ec]">Private yield (roadmap):</b> hold your vault shares as shielded notes — the index stays public, your balance and gains stay private.</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
