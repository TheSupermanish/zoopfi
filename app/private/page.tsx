'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, LockOpen, ShieldCheck, EyeOff, CheckCircle2, ArrowDownLeft } from 'lucide-react';
import { useWallet, formatBalance, formatUSD } from '@/app/lib/chain';
import type { PrivateNote, PrivacyOpKind } from '@/app/lib/chain';
import AppShell from '../components/shell/AppShell';
import { PageShell, PageHeader, Card } from '../components/ui/primitives';
import { useUser, useChainInvalidate } from '@/app/lib/hooks';

type Mode = 'none' | 'shield' | 'transfer' | 'unshield';

const ACTIONS: { mode: Exclude<Mode, 'none'>; Icon: typeof Shield; title: string; subtitle: string }[] = [
  { mode: 'shield', Icon: Shield, title: 'Shield', subtitle: 'Move USDC into your private balance' },
  { mode: 'transfer', Icon: Lock, title: 'Send privately', subtitle: 'Pay a @username with no public trace' },
  { mode: 'unshield', Icon: LockOpen, title: 'Unshield', subtitle: 'Withdraw to your public USDC balance' },
];

export default function PrivatePage() {
  const router = useRouter();
  const { ready, address: walletAddress, authenticated, isConnected, ops } = useWallet();

  const { data: userData, isFetching: userFetching } = useUser();
  const invalidate = useChainInvalidate();
  const isLoading = userData === undefined;

  const [enabled, setEnabled] = useState(false);
  const [privateBalance, setPrivateBalance] = useState('0');
  const [publicBalance, setPublicBalance] = useState('0');
  const [notes, setNotes] = useState<PrivateNote[]>([]);
  const [enabling, setEnabling] = useState(false);

  const [mode, setMode] = useState<Mode>('none');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const [proving, setProving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ kind: PrivacyOpKind; hash: string } | null>(null);

  const refreshPrivacy = useCallback(async () => {
    const on = await ops.privacy.isEnabled();
    setEnabled(on);
    if (on) {
      const [bal, ns] = await Promise.all([ops.privacy.getPrivateBalance('USDC'), ops.privacy.listNotes()]);
      setPrivateBalance(bal);
      setNotes(ns);
    }
    setPublicBalance(await ops.getBalance(walletAddress, 'USDC'));
  }, [ops, walletAddress]);

  useEffect(() => {
    if (!userFetching && userData === null) router.replace('/onboarding');
  }, [userData, userFetching, router]);

  useEffect(() => {
    if (!walletAddress) return;
    refreshPrivacy().catch((e) => console.error('private: load', e));
  }, [walletAddress, refreshPrivacy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (ready && !authenticated && !isConnected) router.replace('/');
    }, 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enablePrivacy = async () => {
    setEnabling(true);
    try {
      await ops.privacy.enable();
      await refreshPrivacy();
    } catch (e) {
      console.error('private: enable', e);
    } finally {
      setEnabling(false);
    }
  };

  const openAction = (m: Exclude<Mode, 'none'>) => {
    setMode(m); setAmount(''); setRecipient(''); setMemo(''); setError(''); setSuccess(null);
  };

  const submit = async () => {
    setError('');
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (mode === 'transfer' && !recipient.trim()) { setError('Enter a recipient @username'); return; }
    if (mode === 'shield' && amt > Number(publicBalance)) { setError('Amount exceeds your public balance'); return; }
    if ((mode === 'transfer' || mode === 'unshield') && amt > Number(privateBalance)) {
      setError('Amount exceeds your private balance'); return;
    }

    setBusy(true);
    setProving(true);
    try {
      let result;
      if (mode === 'shield') result = await ops.privacy.shield(String(amt), 'USDC');
      else if (mode === 'transfer') result = await ops.privacy.transfer(recipient.trim().replace(/^@/, ''), String(amt), 'USDC', memo || undefined);
      else result = await ops.privacy.unshield(String(amt), undefined, 'USDC');

      setProving(false);
      if (!result.success) throw new Error(result.error || 'Operation failed');
      setSuccess({ kind: result.kind, hash: result.hash });
      await refreshPrivacy();
      invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed');
    } finally {
      setBusy(false);
      setProving(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="spinner" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageShell variant="wide" className="flex flex-col gap-6">
        <PageHeader
          icon={Shield}
          accent="violet"
          title="Private"
          subtitle="Shielded USDC powered by zero-knowledge proofs on Stellar"
        />

        {!enabled ? (
          /* Enable card */
          <Card className="text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#9b3bff]/15 text-[#c89bff] flex items-center justify-center mb-6">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-base font-semibold text-white mb-2">Enable your private balance</h2>
            <p className="text-sm text-purple-200/60 max-w-md mx-auto mb-8">
              We&apos;ll derive your private spending keys from a one-time signature. They&apos;re generated and stored on your device only.
            </p>
            <button
              onClick={enablePrivacy}
              disabled={enabling}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white font-semibold text-lg transition hover:shadow-lg hover:shadow-[#7f13ec]/40 disabled:opacity-60"
            >
              {enabling ? 'Setting up…' : 'Enable private balance'}
            </button>
          </Card>
        ) : (
          <>
            {/* Balance + actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <Card className="relative overflow-hidden h-full">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#7f13ec]/10 blur-3xl"
                  />
                  <div className="relative">
                    <p className="flex items-center gap-2 text-sm text-purple-200/55 mb-1">
                      <Shield className="w-4 h-4 text-[#b07bff]" /> Private balance
                    </p>
                    <h2 className="text-4xl font-bold tabular-nums text-white mb-1 sm:text-5xl">
                      {formatBalance(privateBalance)} <span className="text-xl font-medium text-purple-200/50">USDC</span>
                    </h2>
                    <p className="text-xs text-purple-200/45 mb-6">{formatUSD(privateBalance)}</p>
                    <div className="border-t border-white/10 pt-4 text-sm text-purple-200/60">
                      Public balance: <span className="font-semibold text-white">{formatBalance(publicBalance)} USDC</span>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ACTIONS.map((a) => (
                  <button
                    key={a.mode}
                    onClick={() => openAction(a.mode)}
                    className={`surface lift text-left rounded-2xl p-5 transition ${
                      mode === a.mode ? 'border-[#9b3bff]/60 bg-[#9b3bff]/10' : ''
                    }`}
                  >
                    <div className="mb-3 text-[#c89bff]"><a.Icon className="w-7 h-7" /></div>
                    <h3 className="text-base font-semibold text-white">{a.title}</h3>
                    <p className="mt-1 text-xs text-purple-200/60">{a.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Action form */}
            {mode !== 'none' && (
              <Card className="animate-fade-in-up">
                {success ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">
                      {success.kind === 'shield' && 'Added to your private balance'}
                      {success.kind === 'transfer' && 'Sent privately'}
                      {success.kind === 'unshield' && 'Withdrawn to public balance'}
                    </h3>
                    <p className="text-sm text-purple-200/60 font-mono break-all mb-6">{success.hash}</p>
                    <button onClick={() => { setMode('none'); setSuccess(null); }} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white font-semibold transition hover:shadow-lg hover:shadow-[#7f13ec]/40">
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-base font-semibold text-white mb-4">
                      {mode === 'shield' && 'Shield USDC'}
                      {mode === 'transfer' && 'Send privately'}
                      {mode === 'unshield' && 'Unshield USDC'}
                    </h3>
                    <div className="flex flex-col gap-4 max-w-md">
                      {mode === 'transfer' && (
                        <div>
                          <label className="block text-sm font-medium text-purple-200/60 mb-2">Recipient</label>
                          <input
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="@username"
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-purple-200/40 focus:border-[#9b3bff]/60 focus:outline-none transition-colors"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-purple-200/60 mb-2">Amount (USDC)</label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-2xl font-bold text-white placeholder:text-purple-200/40 focus:border-[#9b3bff]/60 focus:outline-none transition-colors"
                        />
                        <p className="text-xs text-purple-200/45 mt-1">
                          {mode === 'shield'
                            ? `Public available: ${formatBalance(publicBalance)} USDC`
                            : `Private available: ${formatBalance(privateBalance)} USDC`}
                        </p>
                      </div>
                      {mode === 'transfer' && (
                        <div>
                          <label className="block text-sm font-medium text-purple-200/60 mb-2">Note (optional, private)</label>
                          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="What's it for?" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-purple-200/40 focus:border-[#9b3bff]/60 focus:outline-none transition-colors" />
                        </div>
                      )}
                      {error && <p className="text-red-400 text-sm">{error}</p>}
                      <div className="flex gap-3">
                        <button
                          onClick={submit}
                          disabled={busy}
                          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white font-semibold transition hover:shadow-lg hover:shadow-[#7f13ec]/40 disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {proving ? (<><div className="spinner-sm spinner" /> Generating proof…</>) : busy ? 'Submitting…' : (
                            mode === 'shield' ? 'Shield' : mode === 'transfer' ? 'Send privately' : 'Unshield'
                          )}
                        </button>
                        <button onClick={() => setMode('none')} disabled={busy} className="px-5 h-12 rounded-xl border border-white/10 bg-white/[0.04] text-white font-semibold hover:bg-white/[0.08] transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            )}

            {/* Private activity */}
            <Card>
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-base font-semibold text-white">Private activity</h3>
                <p className="mt-0.5 text-xs text-purple-200/60">Only visible to you, decrypted on this device</p>
              </div>
              <div className="pt-2">
                {notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#9b3bff]/15 text-[#c89bff] flex items-center justify-center mb-4"><EyeOff className="w-7 h-7" /></div>
                    <p className="font-semibold text-white">No private activity yet</p>
                    <p className="mt-1 text-sm text-purple-200/60">Shield some USDC to get started.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {notes.map((n) => {
                      const label = n.direction === 'shield' ? 'Shielded' : n.direction === 'out' ? `Sent${n.counterparty ? ` to @${n.counterparty}` : ''}` : 'Received';
                      const sign = n.direction === 'out' ? '-' : '+';
                      const color = n.direction === 'out' ? 'text-rose-300' : 'text-emerald-300';
                      const RowIcon = n.direction === 'shield' ? Shield : n.direction === 'out' ? Lock : ArrowDownLeft;
                      return (
                        <div key={n.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#9b3bff]/15 text-[#c89bff] flex items-center justify-center"><RowIcon className="w-5 h-5" /></div>
                            <div>
                              <p className="text-sm font-medium text-white">{label}{n.note && n.note !== 'change' ? ` · ${n.note}` : ''}</p>
                              <p className="text-xs text-purple-200/45">{new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <p className={`font-semibold tabular-nums ${color}`}>{sign}{formatBalance(n.amount)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </PageShell>
    </AppShell>
  );
}
