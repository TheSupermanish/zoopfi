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
  Check, BadgeCheck, Cpu, ArrowUpRight, ShieldCheck, X,
} from 'lucide-react';
import { usePrivacyPool, stroopsToXlm, MAX_DEPOSIT_XLM } from '@/app/lib/privacy/usePrivacyPool';
import { useWallet, getExplorerUrl, getAddressExplorerUrl, getLedgerExplorerUrl, PRIVACY } from '@/app/lib/chain';
import AppShell from '../components/shell/AppShell';
import { WalletSelectionModal } from '../components/wallet-selection-modal';

type Tab = 'shield' | 'send' | 'unshield';

const PHASE_LABEL: Record<string, string> = {
  proving: 'Generating zero-knowledge proof…',
  signing: 'Awaiting wallet signature…',
  submitting: 'Submitting to Stellar…',
  confirming: 'Verifying proof on-chain…',
};

export default function ShieldedPage() {
  const { state, connect, shield, sendPrivateToUsername, unshield, refresh } = usePrivacyPool();
  const { isConnected: appConnected } = useWallet();
  const [tab, setTab] = useState<Tab>('shield');
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [recipient, setRecipient] = useState('');
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  const onAction = async () => {
    setLastTx(null);
    let hash: string | undefined;
    if (tab === 'shield') hash = await shield(amount);
    else if (tab === 'send') hash = await sendPrivateToUsername(sendTo.trim(), amount);
    else hash = await unshield(amount, recipient.trim() || undefined);
    if (hash) { setLastTx(hash); setAmount(''); setSendTo(''); }
  };

  const busy = state.busy;

  const openAction = (t: Tab) => {
    setTab(t); setAmount(''); setSendTo(''); setRecipient(''); setLastTx(null); setModalOpen(true);
  };

  const ACTIONS: { id: Tab; label: string; icon: typeof Shield; accent: string; desc: string }[] = [
    { id: 'shield', label: 'Shield', icon: Shield, accent: 'from-emerald-400 to-teal-600', desc: 'Move public XLM into your private balance.' },
    { id: 'send', label: 'Send private', icon: Send, accent: 'from-[#9b3bff] to-[#6a10c7]', desc: 'Pay a @username — amount and recipient hidden.' },
    { id: 'unshield', label: 'Unshield', icon: LockOpen, accent: 'from-sky-400 to-indigo-600', desc: 'Withdraw from your private balance to a public address.' },
  ];
  const activeAction = ACTIONS.find((a) => a.id === tab) ?? ACTIONS[0];

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
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl shadow-2xl shadow-black/40">
          <div className="rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent p-6 sm:p-8">
            {!state.ready ? (
              <div className="flex items-center justify-center gap-2 py-10 text-purple-200/70">
                <Loader2 className="h-4 w-4 animate-spin" /> Booting the ZK engine…
              </div>
            ) : !state.address ? (
              <div className="py-4">
                {appConnected ? (
                  <button
                    onClick={connect}
                    disabled={busy}
                    className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50 disabled:opacity-60"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {busy ? <><Loader2 className="h-4 w-4 animate-spin" />{state.statusText || 'Connecting…'}</> : 'Unlock private balance'}
                    </span>
                  </button>
                ) : (
                  <WalletSelectionModal>
                    <button className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50">
                      <span className="relative z-10 flex items-center justify-center gap-2">Connect wallet</span>
                    </button>
                  </WalletSelectionModal>
                )}
                <p className="mt-3 text-center text-xs text-purple-200/60">
                  {appConnected
                    ? 'Signs privately with your connected wallet — no second wallet needed.'
                    : 'Social login or any Stellar wallet. Your keys stay on your device.'}
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

                {/* Action cards */}
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {ACTIONS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => openAction(a.id)}
                      disabled={!state.keysReady}
                      className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#9b3bff]/30 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${a.accent} shadow-lg`}>
                        <a.icon className="h-5 w-5 text-white" />
                      </span>
                      <p className="mt-3 font-semibold text-white">{a.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-purple-200/55">{a.desc}</p>
                    </button>
                  ))}
                </div>
                {!state.keysReady && (
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-300/80">
                    <Loader2 className="h-3 w-3 animate-spin" /> Deriving your note keys…
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action modal */}
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

              {/* Header */}
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${activeAction.accent} shadow-lg`}>
                  <activeAction.icon className="h-5 w-5 text-white" />
                </span>
                <div>
                  <h2 className="font-bold text-white">{activeAction.label}</h2>
                  <p className="text-xs text-purple-200/55">Private balance: {stroopsToXlm(state.privateBalance)} XLM</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-purple-200/60">Amount</label>
                  <div className="mt-1.5 flex items-center rounded-2xl border border-white/10 bg-black/30 px-4 focus-within:border-[#9b3bff]/60">
                    <input
                      type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus
                      className="w-full bg-transparent py-3.5 text-xl font-semibold outline-none placeholder:text-purple-200/30"
                    />
                    <span className="text-sm font-medium text-purple-200/40">XLM</span>
                  </div>
                  {tab === 'shield' && (
                    <p className="mt-1.5 text-xs text-purple-200/40">Up to {MAX_DEPOSIT_XLM} XLM per shield (pool limit).</p>
                  )}
                </div>

                {tab === 'send' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-xs font-medium uppercase tracking-wide text-purple-200/60">To</label>
                    <div className="flex items-center rounded-2xl border border-white/10 bg-black/30 px-4 focus-within:border-[#9b3bff]/60">
                      <span className="text-base font-semibold text-purple-200/40">@</span>
                      <input
                        value={sendTo}
                        onChange={(e) => setSendTo(e.target.value.replace(/^@/, ''))}
                        placeholder="username"
                        autoCapitalize="off" autoCorrect="off" spellCheck={false}
                        className="w-full bg-transparent py-3 pl-1 text-base outline-none placeholder:text-purple-200/30"
                      />
                    </div>
                    <p className="text-xs text-purple-200/40">Pay any Zoopfi user by username — recipient and amount stay private.</p>
                  </div>
                )}
                {tab === 'unshield' && (
                  <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient G… address (optional, defaults to you)"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm outline-none placeholder:text-purple-200/30 focus:border-[#9b3bff]/60 animate-fade-in" />
                )}

                <button
                  onClick={onAction}
                  disabled={busy || !state.keysReady || !amount || (tab === 'send' && !sendTo.trim())}
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
            </div>
          </div>
        )}

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
                    <span className="flex items-center gap-2 text-purple-100/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#b07bff]" />
                      <span>Shielded transfer</span>
                      <span className="text-xs text-purple-200/35">
                        {(a.commitments ?? 0)} note{(a.commitments ?? 0) === 1 ? '' : 's'} · {(a.nullifiers ?? 0)} spent · amount hidden
                      </span>
                    </span>
                    {a.txHash ? (
                      <a href={getExplorerUrl(a.txHash)} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-[#b07bff] hover:underline">
                        {a.txHash.slice(0, 8)}… <ArrowUpRight className="inline h-3 w-3" />
                      </a>
                    ) : a.ledger ? (
                      <a href={getLedgerExplorerUrl(a.ledger)} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-[#b07bff] hover:underline">
                        ledger {a.ledger} <ArrowUpRight className="inline h-3 w-3" />
                      </a>
                    ) : null}
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
