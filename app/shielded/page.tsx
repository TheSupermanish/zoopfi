'use client';
/**
 * Zoopfi Shielded Payments — the real ZK private-payments surface.
 *
 * Shield (deposit) public XLM into the pool, send privately (amount +
 * counterparty hidden), and unshield (withdraw). Proofs are generated in the
 * browser (Groth16/Poseidon2) and verified on-chain by our Stellar verifier
 * contract. Compliance (ASP allow/deny) is enforced by the pool.
 */
import { useState } from 'react';
import { Shield, Send, LockOpen, RefreshCw, Lock, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { usePrivacyPool, stroopsToXlm } from '@/app/lib/privacy/usePrivacyPool';
import { getExplorerUrl } from '@/app/lib/chain';

type Tab = 'shield' | 'send' | 'unshield';

export default function ShieldedPage() {
  const { state, connect, shield, sendPrivate, unshield, refresh } = usePrivacyPool();
  const [tab, setTab] = useState<Tab>('shield');
  const [amount, setAmount] = useState('');
  const [noteKey, setNoteKey] = useState('');
  const [encKey, setEncKey] = useState('');
  const [recipient, setRecipient] = useState('');
  const [lastTx, setLastTx] = useState<string | null>(null);

  const onAction = async () => {
    setLastTx(null);
    let hash: string | undefined;
    if (tab === 'shield') hash = await shield(amount);
    else if (tab === 'send') hash = await sendPrivate(amount, noteKey.trim(), encKey.trim());
    else hash = await unshield(amount, recipient.trim() || undefined);
    if (hash) {
      setLastTx(hash);
      setAmount('');
    }
  };

  const busy = state.busy;
  const phaseLabel: Record<string, string> = {
    proving: 'Generating ZK proof…',
    signing: 'Awaiting wallet signature…',
    submitting: 'Submitting to Stellar…',
    confirming: 'Confirming on-chain…',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#1a1122] text-slate-900 dark:text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-xl bg-[#7f13ec]/15 text-[#7f13ec] flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Shielded Payments</h1>
            <p className="text-sm text-slate-500 dark:text-[#ad92c9]">
              Private balance, ZK proofs verified on Stellar
            </p>
          </div>
        </div>

        {/* Connect / balance */}
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-[#4d3267] bg-white dark:bg-[#261933] p-6">
          {!state.ready ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading ZK engine…
            </div>
          ) : !state.address ? (
            <button
              onClick={connect}
              disabled={busy}
              className="w-full py-3 rounded-xl bg-[#7f13ec] hover:bg-[#6a10c7] text-white font-semibold disabled:opacity-50"
            >
              {busy ? state.statusText || 'Connecting…' : 'Connect wallet'}
            </button>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wide text-slate-400">Private balance</p>
              <p className="text-3xl font-bold mt-1">{stroopsToXlm(state.privateBalance)} <span className="text-lg text-slate-400">XLM</span></p>
              <p className="text-xs text-slate-400 mt-1 font-mono truncate">{state.address}</p>
              {!state.keysReady && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">Deriving keys…</p>
              )}
            </>
          )}
        </div>

        {state.address && (
          <>
            {/* Tabs */}
            <div className="mt-6 grid grid-cols-3 gap-2">
              {([
                ['shield', 'Shield', Shield],
                ['send', 'Send private', Send],
                ['unshield', 'Unshield', LockOpen],
              ] as [Tab, string, typeof Shield][]).map(([t, label, Icon]) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    tab === t
                      ? 'border-[#7f13ec] bg-[#7f13ec]/10 text-[#7f13ec]'
                      : 'border-slate-200 dark:border-[#4d3267] text-slate-600 dark:text-[#ad92c9]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="mt-4 rounded-2xl border border-slate-200 dark:border-[#4d3267] bg-white dark:bg-[#261933] p-6 space-y-4">
              <div>
                <label className="text-sm text-slate-500 dark:text-[#ad92c9]">Amount (XLM)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#1a1122] border border-slate-200 dark:border-[#4d3267] focus:border-[#7f13ec] outline-none"
                />
              </div>

              {tab === 'send' && (
                <>
                  <div>
                    <label className="text-sm text-slate-500 dark:text-[#ad92c9]">Recipient note public key (hex)</label>
                    <input value={noteKey} onChange={(e) => setNoteKey(e.target.value)} placeholder="note pubkey…"
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#1a1122] border border-slate-200 dark:border-[#4d3267] focus:border-[#7f13ec] outline-none font-mono text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 dark:text-[#ad92c9]">Recipient encryption key (hex)</label>
                    <input value={encKey} onChange={(e) => setEncKey(e.target.value)} placeholder="encryption pubkey…"
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#1a1122] border border-slate-200 dark:border-[#4d3267] focus:border-[#7f13ec] outline-none font-mono text-sm" />
                  </div>
                </>
              )}

              {tab === 'unshield' && (
                <div>
                  <label className="text-sm text-slate-500 dark:text-[#ad92c9]">Recipient address (optional, defaults to you)</label>
                  <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="G…"
                    className="mt-1 w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#1a1122] border border-slate-200 dark:border-[#4d3267] focus:border-[#7f13ec] outline-none font-mono text-sm" />
                </div>
              )}

              <button
                onClick={onAction}
                disabled={busy || !state.keysReady || !amount}
                className="w-full py-3 rounded-xl bg-[#7f13ec] hover:bg-[#6a10c7] text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {phaseLabel[state.phase] || state.statusText || 'Working…'}</>
                ) : (
                  <>{tab === 'shield' ? 'Shield' : tab === 'send' ? 'Send privately' : 'Unshield'}</>
                )}
              </button>

              {state.error && (
                <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {state.error.code === 'WALLET_NOT_FOUND' && 'No wallet found. Install Freighter or pick another wallet.'}
                    {state.error.code === 'USER_REJECTED' && 'Request declined in your wallet.'}
                    {(!state.error.code || state.error.code === 'WALLET_ERROR') && state.error.message}
                  </span>
                </div>
              )}

              {lastTx && (
                <a href={getExplorerUrl(lastTx)} target="_blank" rel="noopener noreferrer"
                  className="block text-sm text-[#7f13ec] hover:underline">
                  ✓ Confirmed on-chain — view transaction ↗
                </a>
              )}
            </div>

            {/* Activity */}
            <div className="mt-6 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><Eye className="w-4 h-4" /> Pool activity</h2>
              <button onClick={refresh} className="text-slate-400 hover:text-[#7f13ec]"><RefreshCw className="w-4 h-4" /></button>
            </div>
            <div className="mt-2 rounded-2xl border border-slate-200 dark:border-[#4d3267] bg-white dark:bg-[#261933] divide-y divide-slate-100 dark:divide-[#4d3267]">
              {state.activity.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">No activity yet.</p>
              ) : (
                state.activity.slice(0, 10).map((a, i) => (
                  <div key={i} className="p-3 flex items-center justify-between text-sm">
                    <span className="capitalize">{a.kind || 'event'}</span>
                    {a.txHash && (
                      <a href={getExplorerUrl(a.txHash)} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-xs text-[#7f13ec] hover:underline">
                        {a.txHash.slice(0, 8)}…
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
