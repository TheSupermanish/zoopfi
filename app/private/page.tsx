'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, LockOpen, ShieldCheck, EyeOff, CheckCircle2, ArrowDownLeft } from 'lucide-react';
import { useWallet, formatBalance, formatUSD } from '@/app/lib/chain';
import type { PrivateNote, PrivacyOpKind } from '@/app/lib/chain';
import AppShell from '../components/shell/AppShell';
import { useUser, useChainInvalidate } from '@/app/lib/hooks';

type Mode = 'none' | 'shield' | 'transfer' | 'unshield';

const ACTIONS: { mode: Exclude<Mode, 'none'>; Icon: typeof Shield; title: string; subtitle: string }[] = [
  { mode: 'shield', Icon: Shield, title: 'Shield', subtitle: 'Move USDC into your private balance' },
  { mode: 'transfer', Icon: Lock, title: 'Send privately', subtitle: 'Pay a @username with no public trace' },
  { mode: 'unshield', Icon: LockOpen, title: 'Unshield', subtitle: 'Withdraw to your public USDC balance' },
];

export default function PrivatePage() {
  const router = useRouter();
  const { address: walletAddress, authenticated, isConnected, ops } = useWallet();

  const { data: userData } = useUser();
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
    if (userData === null) router.replace('/onboarding');
  }, [userData, router]);

  useEffect(() => {
    if (!walletAddress) return;
    refreshPrivacy().catch((e) => console.error('private: load', e));
  }, [walletAddress, refreshPrivacy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !isConnected) router.replace('/');
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-transparent">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="p-4 md:p-8 flex flex-col gap-6 max-w-[1100px] mx-auto w-full">
        {/* Heading */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7f13ec] to-[#a855f7] flex items-center justify-center shadow-lg shadow-[#7f13ec]/30">
              <Shield className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Private Payments</h1>
              <p className="text-slate-500 dark:text-[#ad92c9]">Shielded USDC powered by zero-knowledge proofs on Stellar</p>
            </div>
          </div>
        </div>

        {!enabled ? (
          /* Enable card */
          <div className="bg-white dark:bg-white/[0.04] rounded-3xl p-10 border border-slate-200 dark:border-white/5 text-center shadow-sm dark:shadow-none">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#7f13ec]/10 flex items-center justify-center mb-6">
              <ShieldCheck className="w-10 h-10 text-[#7f13ec]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Enable your private balance</h2>
            <p className="text-slate-500 dark:text-[#ad92c9] max-w-md mx-auto mb-8">
              We&apos;ll derive your private spending keys from a one-time signature. They&apos;re generated and stored on your device only.
            </p>
            <button
              onClick={enablePrivacy}
              disabled={enabling}
              className="px-8 py-4 rounded-xl bg-[#7f13ec] hover:bg-[#6a10c7] text-white font-bold text-lg transition-colors disabled:opacity-60"
            >
              {enabling ? 'Setting up…' : 'Enable private balance'}
            </button>
          </div>
        ) : (
          <>
            {/* Balance + actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <div className="relative overflow-hidden bg-white dark:bg-white/[0.04] rounded-3xl p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none h-full">
                  <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] bg-[#7f13ec]/10" />
                  <div className="relative">
                    <p className="text-slate-500 dark:text-[#ad92c9] text-sm mb-1 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Private balance
                    </p>
                    <h2 className="text-5xl font-black text-slate-900 dark:text-white mb-1">
                      {formatBalance(privateBalance)} <span className="text-2xl text-slate-400 dark:text-[#ad92c9]">USDC</span>
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-[#ad92c9]/60 mb-6">{formatUSD(privateBalance)}</p>
                    <div className="text-sm text-slate-500 dark:text-[#ad92c9] border-t border-slate-200 dark:border-white/5 pt-4">
                      Public balance: <span className="font-bold text-slate-700 dark:text-white">{formatBalance(publicBalance)} USDC</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ACTIONS.map((a) => (
                  <button
                    key={a.mode}
                    onClick={() => openAction(a.mode)}
                    className={`text-left rounded-2xl p-5 border transition-all ${
                      mode === a.mode
                        ? 'border-[#7f13ec] bg-[#7f13ec]/10'
                        : 'border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.04] hover:border-[#7f13ec]/40'
                    }`}
                  >
                    <div className="mb-3 text-slate-900 dark:text-white"><a.Icon className="w-7 h-7" /></div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{a.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-[#ad92c9] mt-1">{a.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Action form */}
            {mode !== 'none' && (
              <div className="bg-white dark:bg-white/[0.04] rounded-2xl p-6 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none animate-fade-in-up">
                {success ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
                      <CheckCircle2 className="text-emerald-500 w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                      {success.kind === 'shield' && 'Added to your private balance'}
                      {success.kind === 'transfer' && 'Sent privately'}
                      {success.kind === 'unshield' && 'Withdrawn to public balance'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-[#ad92c9] font-mono break-all mb-6">{success.hash}</p>
                    <button onClick={() => { setMode('none'); setSuccess(null); }} className="px-6 py-3 rounded-xl bg-[#7f13ec] hover:bg-[#6a10c7] text-white font-bold transition-colors">
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">
                      {mode === 'shield' && 'Shield USDC'}
                      {mode === 'transfer' && 'Send privately'}
                      {mode === 'unshield' && 'Unshield USDC'}
                    </h3>
                    <div className="flex flex-col gap-4 max-w-md">
                      {mode === 'transfer' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-500 dark:text-[#ad92c9] mb-2">Recipient</label>
                          <input
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="@username"
                            className="input"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-[#ad92c9] mb-2">Amount (USDC)</label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="input text-2xl font-bold"
                        />
                        <p className="text-xs text-slate-400 dark:text-[#ad92c9]/60 mt-1">
                          {mode === 'shield'
                            ? `Public available: ${formatBalance(publicBalance)} USDC`
                            : `Private available: ${formatBalance(privateBalance)} USDC`}
                        </p>
                      </div>
                      {mode === 'transfer' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-500 dark:text-[#ad92c9] mb-2">Note (optional, private)</label>
                          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="What's it for?" className="input" />
                        </div>
                      )}
                      {error && <p className="text-red-400 text-sm">{error}</p>}
                      <div className="flex gap-3">
                        <button
                          onClick={submit}
                          disabled={busy}
                          className="flex-1 h-12 rounded-xl bg-[#7f13ec] hover:bg-[#6a10c7] text-white font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {proving ? (<><div className="spinner-sm spinner" /> Generating proof…</>) : busy ? 'Submitting…' : (
                            mode === 'shield' ? 'Shield' : mode === 'transfer' ? 'Send privately' : 'Unshield'
                          )}
                        </button>
                        <button onClick={() => setMode('none')} disabled={busy} className="px-5 h-12 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Private activity */}
            <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
              <div className="p-6 border-b border-slate-200 dark:border-white/5">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Private activity</h3>
                <p className="text-xs text-slate-500 dark:text-[#ad92c9]">Only visible to you, decrypted on this device</p>
              </div>
              <div className="p-4">
                {notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#7f13ec]/10 flex items-center justify-center mb-4"><EyeOff className="w-7 h-7 text-[#7f13ec]" /></div>
                    <p className="text-slate-900 dark:text-white font-bold">No private activity yet</p>
                    <p className="text-slate-500 dark:text-[#ad92c9] text-sm mt-1">Shield some USDC to get started.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {notes.map((n) => {
                      const label = n.direction === 'shield' ? 'Shielded' : n.direction === 'out' ? `Sent${n.counterparty ? ` to @${n.counterparty}` : ''}` : 'Received';
                      const sign = n.direction === 'out' ? '-' : '+';
                      const color = n.direction === 'out' ? 'text-red-400' : 'text-emerald-400';
                      const RowIcon = n.direction === 'shield' ? Shield : n.direction === 'out' ? Lock : ArrowDownLeft;
                      return (
                        <div key={n.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#7f13ec]/10 flex items-center justify-center text-[#7f13ec]"><RowIcon className="w-5 h-5" /></div>
                            <div>
                              <p className="text-slate-900 dark:text-white font-medium text-sm">{label}{n.note && n.note !== 'change' ? ` · ${n.note}` : ''}</p>
                              <p className="text-slate-500 dark:text-[#ad92c9] text-xs">{new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <p className={`font-bold ${color}`}>{sign}{formatBalance(n.amount)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
