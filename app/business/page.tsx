'use client';
/**
 * Business — the front door for merchants. Personal users see a premium landing
 * (accept payments, payroll, invoicing, private books) with an inline setup that
 * converts the account to a business; business users land on their workspace.
 * The shell's nav automatically flips to Business mode once the account type is
 * business (see app/lib/nav.ts).
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CreditCard,
  Users,
  FileText,
  Send,
  Shield,
  BarChart3,
  ArrowRight,
  Loader2,
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import { useWallet } from '../lib/chain';
import { useUser } from '../lib/hooks';
import { convertToBusiness, type BusinessCategory } from '../lib/api';

const FEATURES = [
  { Icon: CreditCard, accent: 'from-[#9b3bff] to-[#6a10c7]', title: 'Accept payments', body: 'Get paid by username or QR. Funds settle on Stellar in seconds.' },
  { Icon: Users, accent: 'from-blue-400 to-indigo-600', title: 'Run payroll', body: 'Pay your whole team in one batch. Set it once, run it on demand.' },
  { Icon: FileText, accent: 'from-amber-400 to-orange-600', title: 'Send invoices', body: 'Branded invoices with due dates, paid on-chain and reconciled.' },
  { Icon: Send, accent: 'from-pink-400 to-rose-600', title: 'Mass payouts', body: 'Disburse to vendors, contractors and affiliates at once.' },
  { Icon: Shield, accent: 'from-emerald-400 to-teal-600', title: 'Private books', body: 'Shield amounts and counterparties — every proof verified on-chain.' },
  { Icon: BarChart3, accent: 'from-sky-400 to-cyan-600', title: 'Clear analytics', body: 'Track volume, top customers and cashflow at a glance.' },
];

const CATEGORIES: { value: BusinessCategory; label: string }[] = [
  { value: 'retail', label: 'Retail' },
  { value: 'food', label: 'Food & drink' },
  { value: 'services', label: 'Services' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
];

const WORKSPACE_LINKS = [
  { href: '/transact?mode=receive', Icon: CreditCard, title: 'Accept payment', sub: 'From a customer' },
  { href: '/business/payroll', Icon: Users, title: 'Run payroll', sub: 'Pay your team' },
  { href: '/invoices', Icon: FileText, title: 'New invoice', sub: 'Bill a customer' },
  { href: '/contacts', Icon: Users, title: 'Customers', sub: 'Manage clients' },
];

export default function BusinessPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { address, isConnected } = useWallet();
  const { data: user } = useUser();
  const isBusiness = user?.accountType === 'business';

  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [category, setCategory] = useState<BusinessCategory>('retail');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  const setup = async () => {
    setError(null);
    if (!isConnected) {
      router.push('/');
      return;
    }
    if (!name.trim()) {
      setError('Enter your business name');
      return;
    }
    setBusy(true);
    try {
      const [first, ...rest] = owner.trim().split(' ');
      const res = await convertToBusiness(
        address,
        {
          ownerFirstName: first || name.trim(),
          ownerLastName: rest.join(' '),
          category,
        },
        name.trim(),
      );
      if (res?.error) throw new Error(res.error);
      await qc.invalidateQueries({ queryKey: ['user'] });
      router.push('/dashboard');
    } catch (e) {
      setError((e as Error)?.message || 'Could not set up the business account');
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------- Business workspace ---------------------------- */
  if (isBusiness) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#7e22ce] shadow-lg shadow-[#9333ea]/30">
              <Building2 className="h-6 w-6 text-white" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{user?.displayName || 'Business workspace'}</h1>
              <p className="text-sm text-purple-200/55">Everything to get paid and pay your team.</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WORKSPACE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="surface lift group rounded-2xl p-5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#9b3bff]/15 text-[#c89bff]">
                  <l.Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-semibold text-white">{l.title}</p>
                <p className="text-sm text-purple-200/55">{l.sub}</p>
                <ArrowRight className="mt-3 h-4 w-4 text-purple-200/40 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>

          <div className="surface mt-4 rounded-2xl p-6">
            <h2 className="font-semibold text-white">Tools</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition hover:border-white/10 hover:bg-white/[0.04]">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${f.accent} shadow`}>
                    <f.Icon className="h-4 w-4 text-white" />
                  </span>
                  <p className="mt-2.5 text-sm font-medium text-white">{f.title}</p>
                  <p className="mt-0.5 text-xs text-purple-200/65">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ------------------------------- Landing ------------------------------- */
  return (
    <AppShell>
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-8%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[#7f13ec]/14 blur-[150px]" />
        <div className="absolute left-[-10%] bottom-[5%] h-[30rem] w-[30rem] rounded-full bg-blue-500/10 blur-[140px]" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {/* Hero */}
        <div className="animate-fade-in-up text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-purple-100/80 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-[#b07bff]" /> Zoopfi for Business
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
            Run your business on{' '}
            <span className="bg-gradient-to-r from-[#c89bff] to-[#7f13ec] bg-clip-text text-transparent">private rails</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-purple-200/65 sm:text-lg">
            Accept payments, pay your team and invoice customers — settled on Stellar in
            seconds, with on-chain privacy when you need it.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {['Settles in seconds', 'No new wallet', 'Private books'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-purple-100/75">
                <Check className="h-3.5 w-3.5 text-emerald-300/80" /> {t}
              </span>
            ))}
          </div>

          {/* Primary CTA */}
          <div className="mt-8 flex flex-col items-center">
            <button
              onClick={() => { setError(null); setShowSetup(true); }}
              className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#a855f7] to-[#7e22ce] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#9333ea]/30 transition hover:shadow-[#9333ea]/50"
            >
              <Building2 className="h-5 w-5" /> Register your business
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-purple-200/65">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> No new wallet — your address stays the same
            </p>
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group relative animate-rise-in overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 transition hover:-translate-y-1 hover:border-[#9b3bff]/30 hover:shadow-xl hover:shadow-[#7f13ec]/10"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.accent} shadow-lg`}>
                <f.Icon className="h-6 w-6 text-white" />
              </span>
              <p className="mt-4 text-base font-semibold text-white">{f.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-purple-200/55">{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Setup modal */}
      {showSetup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !busy && setShowSetup(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#1a1228] to-[#120c1c] p-6 shadow-2xl shadow-black/60 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => !busy && setShowSetup(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-purple-200/50 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#7e22ce] shadow-lg shadow-[#9333ea]/30">
              <Building2 className="h-6 w-6 text-white" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-white">Register your business</h2>
            <p className="mt-1 text-sm text-purple-200/55">
              Switch your wallet to a business profile — keep the same address, unlock payroll, invoicing and private books.
            </p>

            <label className="mt-5 block text-xs font-medium uppercase tracking-wide text-purple-200/60">
              Business name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Brew & Bean Cafe"
              autoFocus
              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition-colors placeholder:text-purple-200/30 focus:border-[#9b3bff]/60"
            />

            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-purple-200/60">
              Owner name
            </label>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Alex Rivera"
              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition-colors placeholder:text-purple-200/30 focus:border-[#9b3bff]/60"
            />

            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-purple-200/60">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BusinessCategory)}
              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition-colors focus:border-[#9b3bff]/60"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-[#160f22]">
                  {c.label}
                </option>
              ))}
            </select>

            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

            <button
              onClick={setup}
              disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#a855f7] to-[#7e22ce] py-3.5 font-semibold text-white shadow-lg shadow-[#9333ea]/30 transition hover:shadow-[#9333ea]/50 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Setting up…
                </>
              ) : isConnected ? (
                <>
                  <Building2 className="h-4 w-4" /> Create business account
                </>
              ) : (
                <>Connect a wallet first <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-purple-200/65">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> No new wallet — your address stays the same
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
