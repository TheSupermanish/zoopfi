'use client';
/**
 * Swap — DeFi over the Stellar DEX (orderbook path payments).
 *
 * Quote via Horizon path-finding, execute a strict-send path payment to self.
 * Real on testnet (CHAIN_ADAPTER=stellar); simulated in mock mode.
 */
import { useEffect, useRef, useState } from 'react';
import AppShell from '../components/shell/AppShell';
import { ArrowDownUp, Loader2, AlertCircle, Check, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useWallet, getExplorerUrl } from '@/app/lib/chain';
import type { AssetCode, SwapQuote } from '@/app/lib/chain/types';

const SLIPPAGE = 0.005; // 0.5%

export default function SwapPage() {
  const { ops, address, isConnected } = useWallet();
  const [from, setFrom] = useState<AssetCode>('XLM');
  const [to, setTo] = useState<AssetCode>('USDC');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live quote (debounced) as the user types.
  useEffect(() => {
    setQuote(null);
    setError(null);
    if (!amount || Number(amount) <= 0 || from === to) return;
    if (debounce.current) clearTimeout(debounce.current);
    setQuoting(true);
    debounce.current = setTimeout(async () => {
      try {
        const q = await ops.getSwapQuote(from, to, amount);
        setQuote(q);
      } finally {
        setQuoting(false);
      }
    }, 450);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [amount, from, to, ops]);

  const flip = () => { setFrom(to); setTo(from); setAmount(''); setQuote(null); };

  const minReceive = quote?.available
    ? (Number(quote.estimate) * (1 - SLIPPAGE)).toFixed(7)
    : '0';

  const onSwap = async () => {
    if (!quote?.available) return;
    setBusy(true); setError(null); setLastTx(null); setStatus('Swapping…');
    try {
      const res = await ops.swap(from, to, amount, minReceive);
      if (!res.success) throw new Error(res.error || 'Swap failed');
      setLastTx(res.hash);
      setAmount(''); setQuote(null);
    } catch (e) {
      setError((e as Error)?.message || 'Swap failed');
    } finally {
      setBusy(false); setStatus('');
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Swap</h1>
          <p className="text-sm text-slate-500 dark:text-[#ad92c9]">Trade over the Stellar DEX orderbook</p>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-5 space-y-2">
          {/* From */}
          <div className="rounded-2xl bg-slate-50 dark:bg-black/20 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#ad92c9]">
              <span>You pay</span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                className="w-full bg-transparent text-2xl font-semibold text-slate-900 dark:text-white outline-none"
              />
              <AssetPill code={from} onChange={setFrom} other={to} />
            </div>
          </div>

          {/* Flip */}
          <div className="flex justify-center">
            <button onClick={flip} className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] p-2 text-[#7f13ec] hover:bg-[#7f13ec]/10 transition">
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>

          {/* To */}
          <div className="rounded-2xl bg-slate-50 dark:bg-black/20 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#ad92c9]">
              <span>You receive (est.)</span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <div className="w-full text-2xl font-semibold text-slate-900 dark:text-white">
                {quoting ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : quote?.available ? Number(quote.estimate).toFixed(4) : '0.00'}
              </div>
              <AssetPill code={to} onChange={setTo} other={from} />
            </div>
          </div>

          {/* Quote details */}
          {quote?.available && (
            <div className="px-1 pt-1 text-xs text-slate-500 dark:text-[#ad92c9] space-y-1">
              <div className="flex justify-between"><span>Rate</span><span>1 {from} ≈ {Number(quote.price).toFixed(4)} {to}</span></div>
              <div className="flex justify-between"><span>Min received (0.5% slippage)</span><span>{Number(minReceive).toFixed(4)} {to}</span></div>
            </div>
          )}
          {quote && !quote.available && amount && !quoting && (
            <p className="px-1 pt-1 text-xs text-amber-600 dark:text-amber-400">No DEX path with liquidity for this pair/amount on testnet.</p>
          )}

          {/* Action */}
          {!isConnected ? (
            <a href="/" className="mt-2 block w-full rounded-2xl bg-[#7f13ec] py-3.5 text-center font-semibold text-white">Connect wallet</a>
          ) : (
            <button
              onClick={onSwap}
              disabled={busy || !quote?.available}
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-3.5 font-semibold text-white shadow-lg shadow-[#7f13ec]/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {status || 'Swapping…'}</> : 'Swap'}
            </button>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          )}
          {lastTx && (
            <a href={getExplorerUrl(lastTx)} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Swapped — view transaction <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400 dark:text-[#ad92c9]/60">
          Private swaps (shield → swap → re-shield) are on the roadmap.
        </p>
      </div>
    </AppShell>
  );
}

function AssetPill({ code, onChange, other }: { code: AssetCode; onChange: (c: AssetCode) => void; other: AssetCode }) {
  const opts: AssetCode[] = ['XLM', 'USDC'];
  return (
    <select
      value={code}
      onChange={(e) => onChange(e.target.value as AssetCode)}
      className="shrink-0 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white outline-none"
    >
      {opts.map((o) => <option key={o} value={o} disabled={o === other}>{o}</option>)}
    </select>
  );
}
