'use client';
/**
 * Zoopfi Shielded Payments — the privacy point for Stellar.
 *
 * Private balance + shielded send: amounts and counterparties stay hidden,
 * proofs (Groth16/BN254/Poseidon2) are generated in the browser and verified
 * on-chain by our Stellar verifier contract. Compliance via ASP allow/deny.
 */
import { useState } from 'react';
import {
  Shield, Send, LockOpen, RefreshCw, Eye, EyeOff, AlertCircle, Loader2,
  Check, BadgeCheck, Cpu, ArrowUpRight, ShieldCheck,
} from 'lucide-react';
import { usePrivacyPool, stroopsToXlm } from '@/app/lib/privacy/usePrivacyPool';
import { getExplorerUrl, getAddressExplorerUrl, PRIVACY } from '@/app/lib/chain';
import AppShell from '../components/shell/AppShell';

type Tab = 'shield' | 'send' | 'unshield';

const PHASE_LABEL: Record<string, string> = {
  proving: 'Generating zero-knowledge proof…',
  signing: 'Awaiting wallet signature…',
  submitting: 'Submitting to Stellar…',
  confirming: 'Verifying proof on-chain…',
};

export default function ShieldedPage() {
  const { state, connect, shield, sendPrivate, unshield, refresh } = usePrivacyPool();
  const [tab, setTab] = useState<Tab>('shield');
  const [amount, setAmount] = useState('');
  const [noteKey, setNoteKey] = useState('');
  const [encKey, setEncKey] = useState('');
  const [recipient, setRecipient] = useState('');
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  const onAction = async () => {
    setLastTx(null);
    let hash: string | undefined;
    if (tab === 'shield') hash = await shield(amount);
    else if (tab === 'send') hash = await sendPrivate(amount, noteKey.trim(), encKey.trim());
    else hash = await unshield(amount, recipient.trim() || undefined);
    if (hash) { setLastTx(hash); setAmount(''); }
  };

  const busy = state.busy;
  const TABS: [Tab, string, typeof Shield][] = [
    ['shield', 'Shield', Shield],
    ['send', 'Send private', Send],
    ['unshield', 'Unshield', LockOpen],
  ];

  return (
    <AppShell>
      <div className="relative mx-auto max-w-2xl px-4 py-10 sm:py-16">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-[#7f13ec]/40 blur-2xl animate-pulse-glow" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9b3bff] to-[#6a10c7] shadow-lg shadow-[#7f13ec]/40">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="bg-gradient-to-r from-white via-purple-100 to-[#c89bff] bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Private by default
          </h1>
          <p className="mt-3 max-w-md text-balance text-sm text-purple-200/70 sm:text-base">
            Shielded payments for Stellar. Amounts and counterparties stay hidden;
            every proof is verified on-chain.
          </p>

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {[
              [BadgeCheck, 'Live on testnet'],
              [Cpu, 'Groth16 · BN254 · Poseidon2'],
              [ShieldCheck, 'ASP-compliant'],
            ].map(([Icon, label], i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-purple-100/80 backdrop-blur">
                <Icon className="h-3.5 w-3.5 text-[#b07bff]" />
                {label as string}
              </span>
            ))}
          </div>
        </div>

        {/* Main card */}
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl shadow-2xl shadow-black/40">
          <div className="rounded-[1.35rem] bg-gradient-to-b from-white/[0.03] to-transparent p-6 sm:p-8">
            {!state.ready ? (
              <div className="flex items-center justify-center gap-2 py-10 text-purple-200/70">
                <Loader2 className="h-4 w-4 animate-spin" /> Booting the ZK engine…
              </div>
            ) : !state.address ? (
              <div className="py-4">
                <button
                  onClick={connect}
                  disabled={busy}
                  className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50 disabled:opacity-60"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{state.statusText || 'Connecting…'}</> : 'Connect wallet'}
                  </span>
                </button>
                <p className="mt-3 text-center text-xs text-purple-200/60">
                  Freighter · xBull · Albedo · Lobstr — pick any Stellar wallet
                </p>
              </div>
            ) : (
              <>
                {/* Private balance */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#7f13ec]/20 to-indigo-900/10 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-widest text-purple-200/60">Private balance</span>
                    <button onClick={() => setReveal((r) => !r)} className="text-purple-200/60 hover:text-white transition">
                      {reveal ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-4xl font-bold tabular-nums transition ${reveal ? '' : 'blur-md select-none'}`}>
                      {stroopsToXlm(state.privateBalance)}
                    </span>
                    <span className="text-lg font-medium text-purple-200/60">XLM</span>
                  </div>
                  <p className="mt-2 truncate font-mono text-xs text-purple-200/40">{state.address}</p>
                  {!state.keysReady && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-300/80">
                      <Loader2 className="h-3 w-3 animate-spin" /> Deriving your note keys…
                    </p>
                  )}
                </div>

                {/* Segmented tabs */}
                <div className="mt-5 grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
                  {TABS.map(([t, label, Icon]) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition ${
                        tab === t ? 'bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white shadow' : 'text-purple-200/60 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>

                {/* Form */}
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-purple-200/60">Amount</label>
                    <div className="mt-1.5 flex items-center rounded-2xl border border-white/10 bg-black/30 px-4 focus-within:border-[#9b3bff]/60">
                      <input
                        type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                        className="w-full bg-transparent py-3.5 text-xl font-semibold outline-none placeholder:text-purple-200/30"
                      />
                      <span className="text-sm font-medium text-purple-200/40">XLM</span>
                    </div>
                  </div>

                  {tab === 'send' && (
                    <div className="space-y-3 animate-fade-in">
                      <input value={noteKey} onChange={(e) => setNoteKey(e.target.value)} placeholder="Recipient note public key (hex)"
                        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm outline-none placeholder:text-purple-200/30 focus:border-[#9b3bff]/60" />
                      <input value={encKey} onChange={(e) => setEncKey(e.target.value)} placeholder="Recipient encryption key (hex)"
                        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm outline-none placeholder:text-purple-200/30 focus:border-[#9b3bff]/60" />
                    </div>
                  )}
                  {tab === 'unshield' && (
                    <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient G… address (optional, defaults to you)"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm outline-none placeholder:text-purple-200/30 focus:border-[#9b3bff]/60 animate-fade-in" />
                  )}

                  <button
                    onClick={onAction}
                    disabled={busy || !state.keysReady || !amount}
                    className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-3.5 text-base font-semibold shadow-lg shadow-[#7f13ec]/30 transition enabled:hover:shadow-[#7f13ec]/50 disabled:opacity-50"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {busy ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> {PHASE_LABEL[state.phase] || state.statusText || 'Working…'}</>
                      ) : (
                        <>{tab === 'shield' ? 'Shield funds' : tab === 'send' ? 'Send privately' : 'Unshield funds'}</>
                      )}
                    </span>
                    {busy && <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />}
                  </button>

                  {/* Proving stepper */}
                  {busy && (
                    <div className="flex items-center justify-center gap-2 text-xs text-purple-200/60">
                      {['proving', 'signing', 'submitting', 'confirming'].map((p) => (
                        <span key={p} className={`h-1.5 w-1.5 rounded-full transition ${state.phase === p ? 'bg-[#b07bff] scale-150' : 'bg-white/20'}`} />
                      ))}
                    </div>
                  )}

                  {state.error && (
                    <div className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 animate-fade-in">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {state.error.code === 'WALLET_NOT_FOUND' && 'No Stellar wallet found. Install Freighter or pick another wallet.'}
                        {state.error.code === 'USER_REJECTED' && 'Request declined in your wallet.'}
                        {state.error.code === 'INSUFFICIENT_BALANCE' && 'Insufficient balance for this transaction.'}
                        {(!state.error.code || state.error.code === 'WALLET_ERROR') && state.error.message}
                      </span>
                    </div>
                  )}

                  {lastTx && (
                    <a href={getExplorerUrl(lastTx)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/15 animate-fade-in">
                      <Check className="h-4 w-4" /> Proof verified on-chain — view transaction <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Activity */}
        {state.address && (
          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-purple-100/80"><Eye className="h-4 w-4" /> Pool activity</h2>
              <button onClick={refresh} className="text-purple-200/60 transition hover:text-white"><RefreshCw className="h-4 w-4" /></button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
              {state.activity.length === 0 ? (
                <p className="p-4 text-sm text-purple-200/40">No shielded activity yet. Shield some funds to begin.</p>
              ) : (
                state.activity.slice(0, 8).map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 text-sm">
                    <span className="flex items-center gap-2 capitalize text-purple-100/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#b07bff]" /> {a.kind || 'event'}
                    </span>
                    {a.txHash && (
                      <a href={getExplorerUrl(a.txHash)} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-[#b07bff] hover:underline">
                        {a.txHash.slice(0, 8)}… <ArrowUpRight className="inline h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Verifier footer */}
        <div className="mt-10 flex flex-col items-center gap-1 text-center text-xs text-purple-200/40">
          <p>Zero-knowledge proofs verified by an on-chain Stellar contract.</p>
          {PRIVACY.verifier && (
            <a href={getAddressExplorerUrl(PRIVACY.verifier)} target="_blank" rel="noopener noreferrer" className="font-mono text-[#b07bff]/70 hover:text-[#b07bff]">
              verifier {PRIVACY.verifier.slice(0, 6)}…{PRIVACY.verifier.slice(-4)} ↗
            </a>
          )}
        </div>
      </div>
    </AppShell>
  );
}
