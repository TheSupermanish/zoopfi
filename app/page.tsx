'use client';
/**
 * App-first home (Jupiter-style): land straight in the product — a Send/Pay
 * widget with a Private (shielded) toggle. No marketing page. Visible before
 * connecting; Connect lives in the top nav and on the action button.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Globe, Loader2, Check, ArrowUpRight, AlertCircle, ShieldCheck, Zap } from 'lucide-react';
import AppShell from './components/shell/AppShell';
import { WalletSelectionModal } from './components/wallet-selection-modal';
import { useWallet, getExplorerUrl } from './lib/chain';
import { getUserByUsername } from './lib/api';
import type { AssetCode } from './lib/chain/types';

export default function Home() {
  const router = useRouter();
  const { isConnected, ops } = useWallet();
  const [priv, setPriv] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState<AssetCode>('USDC');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const pay = async () => {
    setError(null); setLastTx(null);
    if (!amount || Number(amount) <= 0) { setError('Enter an amount'); return; }
    if (!recipient.trim()) { setError('Enter a recipient'); return; }

    // Private mode hands off to the full shielded flow (real ZK proving lives there).
    if (priv) {
      router.push(`/shielded?amount=${encodeURIComponent(amount)}`);
      return;
    }

    setBusy(true); setStatus('Resolving recipient…');
    try {
      let to = recipient.trim();
      if (!/^[GC][A-Z2-7]{55}$/.test(to)) {
        const user = await getUserByUsername(to.replace(/^@/, ''));
        if (!user?.walletAddress) throw new Error(`Couldn't find @${to.replace(/^@/, '')}`);
        to = user.walletAddress;
      }
      setStatus('Sending…');
      const res = await ops.sendPayment(to, amount, asset);
      if (!res.success) throw new Error(res.error || 'Payment failed');
      setLastTx(res.hash); setAmount(''); setRecipient('');
    } catch (e) {
      setError((e as Error)?.message || 'Payment failed');
    } finally {
      setBusy(false); setStatus('');
    }
  };

  return (
    <AppShell>
      <div className="relative mx-auto flex max-w-md flex-col items-center px-4 pt-10 pb-8 sm:pt-16">
        {/* Heading */}
        <div className="mb-6 text-center animate-fade-in-up">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Send money{' '}
            <span className={`bg-clip-text text-transparent transition-all duration-500 ${priv ? 'bg-gradient-to-r from-[#c89bff] to-[#9b3bff]' : 'bg-gradient-to-r from-white to-purple-200'}`}>
              {priv ? 'privately' : 'on Stellar'}
            </span>
          </h1>
          <p className="mt-2 text-sm text-purple-200/60">
            Pay any <span className="text-purple-200">@username</span> or address — public, or shielded with zero-knowledge.
          </p>
        </div>

        {/* Pay card */}
        <div className={`w-full rounded-3xl border bg-white/[0.04] p-1 backdrop-blur-xl transition-all duration-500 ${priv ? 'border-[#9b3bff]/50 shadow-[0_0_40px_-8px_rgba(127,19,236,0.5)]' : 'border-white/10 shadow-2xl shadow-black/40'}`}>
          <div className="rounded-[1.35rem] bg-gradient-to-b from-white/[0.03] to-transparent p-5 sm:p-6">
            {/* Private toggle */}
            <button
              onClick={() => setPriv((p) => !p)}
              className={`mb-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition-all duration-300 ${priv ? 'border-[#9b3bff]/50 bg-[#7f13ec]/15' : 'border-white/10 bg-black/20'}`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300 ${priv ? 'bg-[#7f13ec] text-white' : 'bg-white/10 text-purple-200/60'}`}>
                  {priv ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                </span>
                <span className={priv ? 'text-white' : 'text-purple-200/70'}>
                  {priv ? 'Private — amount & recipient hidden' : 'Public payment'}
                </span>
              </span>
              {/* switch */}
              <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${priv ? 'bg-[#9b3bff]' : 'bg-white/15'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${priv ? 'left-[1.4rem]' : 'left-0.5'}`} />
              </span>
            </button>

            {/* Amount */}
            <label className="text-xs font-medium uppercase tracking-wide text-purple-200/50">You send</label>
            <div className="mt-1.5 flex items-center rounded-2xl border border-white/10 bg-black/30 px-4 focus-within:border-[#9b3bff]/60 transition-colors">
              <input
                type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                className="w-full bg-transparent py-3.5 text-2xl font-semibold outline-none placeholder:text-purple-200/30"
              />
              <select value={asset} onChange={(e) => setAsset(e.target.value as AssetCode)}
                className="shrink-0 rounded-full border border-white/10 bg-[#1a1122] px-3 py-2 text-sm font-semibold outline-none">
                <option value="USDC">USDC</option>
                <option value="XLM">XLM</option>
              </select>
            </div>

            {/* Recipient */}
            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-purple-200/50">To</label>
            <input
              value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="@username or G… address"
              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 outline-none placeholder:text-purple-200/30 focus:border-[#9b3bff]/60 transition-colors"
            />

            {/* Action */}
            {!isConnected ? (
              <WalletSelectionModal>
                <button className="mt-5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-4 text-base font-semibold shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50">
                  Connect to {priv ? 'send privately' : 'pay'}
                </button>
              </WalletSelectionModal>
            ) : (
              <button
                onClick={pay}
                disabled={busy}
                className="relative mt-5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-4 text-base font-semibold shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50 disabled:opacity-60"
              >
                {busy ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {status || 'Working…'}</>
                ) : (
                  <>{priv ? <Lock className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />} {priv ? 'Send privately' : 'Pay'}</>
                )}
                {busy && <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />}
              </button>
            )}

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 animate-fade-in">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
              </div>
            )}
            {lastTx && (
              <a href={getExplorerUrl(lastTx)} target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-300 animate-fade-in">
                <Check className="h-4 w-4" /> Sent — view on Stellar <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Trust row */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-purple-200/50">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#b07bff]" /> ZK verified on-chain</span>
          <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-[#b07bff]" /> Stellar testnet</span>
          <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-[#b07bff]" /> Private by choice</span>
        </div>
      </div>
    </AppShell>
  );
}
