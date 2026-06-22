'use client';
/**
 * Swap — DeFi over the Stellar DEX (orderbook path payments).
 *
 * Quote via Horizon path-finding, execute a strict-send path payment to self.
 * Real on testnet (CHAIN_ADAPTER=stellar); simulated in mock mode.
 */
import { useEffect, useRef, useState } from 'react';
import AppShell from '../components/shell/AppShell';
import { ArrowDownUp, Loader2, AlertCircle, Check, ArrowUpRight, ShieldCheck, Lock } from 'lucide-react';
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
  const [mode, setMode] = useState<'public' | 'private'>('public');
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
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-8%] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[#7f13ec]/14 blur-[150px]" />
        <div className="absolute right-[-8%] bottom-[10%] h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-md px-4 py-10 sm:py-14">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-[#7f13ec]/35 blur-2xl animate-pulse-glow" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9b3bff] to-[#6a10c7] shadow-lg shadow-[#7f13ec]/40">
              <ArrowDownUp className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="bg-gradient-to-r from-white via-purple-100 to-[#c89bff] bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Swap
          </h1>
          <p className="mt-3 max-w-xs text-balance text-sm text-purple-200/70 sm:text-base">
            Trade instantly over the native Stellar DEX orderbook.
          </p>
        </div>

        {/* Swap card */}
        <div className="mt-8 space-y-2 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 shadow-2xl shadow-black/40 sm:p-5">
          {/* Public / Private mode */}
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-black/30 p-1">
            <button
              onClick={() => setMode('public')}
              className={`rounded-xl py-2 text-sm font-semibold transition ${mode === 'public' ? 'bg-white/[0.08] text-white shadow' : 'text-purple-200/55 hover:text-purple-100'}`}
            >
              Public
            </button>
            <button
              onClick={() => setMode('private')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition ${mode === 'private' ? 'bg-[#9b3bff]/15 text-[#c89bff]' : 'text-purple-200/55 hover:text-purple-100'}`}
            >
              <Lock className="h-3.5 w-3.5" /> Private
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-purple-200/70">Soon</span>
            </button>
          </div>

          {mode === 'private' && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-[#7f13ec]/25 bg-[#7f13ec]/[0.08] p-3.5 text-xs text-purple-200/70 animate-fade-in">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#b07bff]" />
              <span>
                <b className="text-[#c89bff]">Private swap (coming soon).</b> Shield your funds into the ZK pool, swap inside it,
                and re-shield the output — so the amount and the pair you trade never touch the public orderbook.
              </span>
            </div>
          )}

          {/* From */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between text-xs text-purple-200/60">
              <span>You pay</span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                className="w-full bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-purple-200/25"
              />
              <AssetPill code={from} onChange={setFrom} other={to} />
            </div>
          </div>

          {/* Flip */}
          <div className="flex justify-center" style={{ marginTop: '-0.5rem', marginBottom: '-0.5rem' }}>
            <button onClick={flip} className="relative z-10 rounded-xl border border-white/10 bg-[#160f22] p-2.5 text-[#c89bff] shadow-lg transition hover:bg-[#9b3bff]/20 hover:scale-105">
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>

          {/* To */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between text-xs text-purple-200/60">
              <span>You receive (est.)</span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <div className="w-full text-2xl font-semibold text-white">
                {quoting ? <Loader2 className="h-5 w-5 animate-spin text-purple-200/50" /> : quote?.available ? Number(quote.estimate).toFixed(4) : '0.00'}
              </div>
              <AssetPill code={to} onChange={setTo} other={from} />
            </div>
          </div>

          {/* Quote details */}
          {quote?.available && (
            <div className="rounded-2xl bg-black/20 px-3.5 py-3 text-xs text-purple-200/60 space-y-1.5 animate-fade-in">
              <div className="flex justify-between"><span>Rate</span><span className="tabular-nums text-purple-100/80">1 {from} ≈ {Number(quote.price).toFixed(4)} {to}</span></div>
              <div className="flex justify-between"><span>Min received (0.5% slippage)</span><span className="tabular-nums text-purple-100/80">{Number(minReceive).toFixed(4)} {to}</span></div>
            </div>
          )}
          {quote && !quote.available && amount && !quoting && (
            <p className="px-1 pt-1 text-xs text-amber-400">No DEX path with liquidity for this pair/amount on testnet.</p>
          )}

          {/* Action */}
          {!isConnected ? (
            <a href="/" className="mt-2 block w-full rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-3.5 text-center font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50">Connect wallet</a>
          ) : mode === 'private' ? (
            <button disabled className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 font-semibold text-purple-200/55">
              <Lock className="h-4 w-4" /> Private swap — coming soon
            </button>
          ) : (
            <button
              onClick={onSwap}
              disabled={busy || !quote?.available}
              className="relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-3.5 font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition enabled:hover:shadow-[#7f13ec]/50 disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {status || 'Swapping…'}</> : 'Swap'}
              </span>
              {busy && <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />}
            </button>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 animate-fade-in">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          )}
          {lastTx && (
            <a href={getExplorerUrl(lastTx)} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-400 animate-fade-in">
              <Check className="h-4 w-4" /> Swapped — view transaction <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
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
      className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-[#9b3bff]/60"
    >
      {opts.map((o) => <option key={o} value={o} disabled={o === other}>{o}</option>)}
    </select>
  );
}
