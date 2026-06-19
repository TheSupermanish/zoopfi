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
} from 'lucide-react';
import AppShell from '../components/shell/AppShell';
import { useWallet } from '../lib/chain';
import { useUser } from '../lib/hooks';
import { convertToBusiness, type BusinessCategory } from '../lib/api';

const FEATURES = [
  { Icon: CreditCard, title: 'Accept payments', body: 'Get paid by username or QR. Funds settle on Stellar in seconds.' },
  { Icon: Users, title: 'Run payroll', body: 'Pay your whole team in one batch. Set it once, run it on demand.' },
  { Icon: FileText, title: 'Send invoices', body: 'Branded invoices with due dates, paid on-chain and reconciled.' },
  { Icon: Send, title: 'Mass payouts', body: 'Disburse to vendors, contractors and affiliates at once.' },
  { Icon: Shield, title: 'Private books', body: 'Shield amounts and counterparties — every proof verified on-chain.' },
  { Icon: BarChart3, title: 'Clear analytics', body: 'Track volume, top customers and cashflow at a glance.' },
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
                <div key={f.title} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <f.Icon className="h-5 w-5 text-[#b07bff]" />
                  <p className="mt-2 text-sm font-medium text-white">{f.title}</p>
                  <p className="mt-0.5 text-xs text-purple-200/45">{f.body}</p>
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
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
        {/* Hero */}
        <div className="animate-fade-in-up text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-purple-100/80 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-[#b07bff]" /> Zoopfi for Business
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
            Run your business on{' '}
            <span className="text-gradient-brand">private rails</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-purple-200/60">
            Accept payments, pay your team and invoice customers — settled on Stellar in
            seconds, with on-chain privacy when you need it.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="surface lift animate-rise-in rounded-2xl p-5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#9b3bff]/15 text-[#c89bff]">
                <f.Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-semibold text-white">{f.title}</p>
              <p className="mt-1 text-sm text-purple-200/55">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Setup card */}
        <div className="mx-auto mt-12 max-w-md">
          <div className="surface-strong rounded-3xl p-6 sm:p-7">
            <h2 className="text-lg font-bold text-white">Create your business account</h2>
            <p className="mt-1 text-sm text-purple-200/55">
              Switch your wallet to a business profile. You can keep using the same address.
            </p>

            <label className="mt-5 block text-xs font-medium uppercase tracking-wide text-purple-200/50">
              Business name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Brew & Bean Cafe"
              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition-colors placeholder:text-purple-200/30 focus:border-[#9b3bff]/60"
            />

            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-purple-200/50">
              Owner name
            </label>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Alex Rivera"
              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition-colors placeholder:text-purple-200/30 focus:border-[#9b3bff]/60"
            />

            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-purple-200/50">
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
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-purple-200/45">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> No new wallet — your address stays the same
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
