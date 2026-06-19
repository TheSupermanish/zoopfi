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
import AppShell from '../components/shell/AppShell';
import { PageShell, PageHeader, Card, StatTile } from '../components/ui/primitives';
import { TrendingUp, Loader2, AlertCircle, Check, ArrowUpRight, Lock, Percent, Coins } from 'lucide-react';
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
        // Withdraw by share amount = assets / price. Requires a fresh index;
        // never fall back to 1.0 (that would over-redeem shares).
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

  return (
    <AppShell>
      <PageShell variant="focused">
        <PageHeader
          center
          icon={TrendingUp}
          accent="emerald"
          title="Yield Vault"
          subtitle="Earn on-chain yield on Stellar"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="APY" icon={Percent} accent="emerald" value={apy != null ? `${apy}%` : '—'} />
          <StatTile label="Price / share" icon={Coins} value={index != null ? index.toFixed(6) : '—'} />
        </div>

        {/* Position */}
        {isConnected && (
          <Card className="mt-3">
            <p className="text-xs text-purple-200/55">Your position</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-white">
              {value.toFixed(4)} <span className="text-base font-medium text-purple-200/50">USDC</span>
            </p>
            <p className="mt-1 text-xs text-emerald-300">{shares > BigInt(0) ? 'Earning yield — grows every ledger' : 'No deposit yet'}</p>
          </Card>
        )}

        {/* Action */}
        <Card className="mt-4">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1">
            {(['deposit', 'withdraw'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-lg py-2 text-sm font-medium capitalize transition ${tab === t ? 'bg-white/[0.08] text-white shadow' : 'text-purple-200/60'}`}>
                {t}
              </button>
            ))}
          </div>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xl font-semibold text-white outline-none focus:border-[#9b3bff]/60" />

          {!isConnected ? (
            <a href="/" className="mt-3 block w-full rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-3.5 text-center font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50">Connect wallet</a>
          ) : (
            <button onClick={onAction} disabled={busy || !amount || !VAULT}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-3.5 font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50 disabled:opacity-50">
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Working…</> : (tab === 'deposit' ? 'Deposit & earn' : 'Withdraw')}
            </button>
          )}

          {!VAULT && <p className="mt-2 text-xs text-amber-400">Vault contract not configured.</p>}
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          )}
          {lastTx && (
            <a href={getExplorerUrl(lastTx)} target="_blank" rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-300">
              <Check className="h-4 w-4" /> Confirmed — view transaction <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </Card>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#7f13ec]/20 bg-[#7f13ec]/5 p-3 text-xs text-purple-200/60">
          <Lock className="h-4 w-4 shrink-0 text-[#b07bff]" />
          <span><b className="text-[#c89bff]">Private yield (roadmap):</b> hold your vault shares as shielded notes — the index stays public, your balance and gains stay private.</span>
        </div>
      </PageShell>
    </AppShell>
  );
}
