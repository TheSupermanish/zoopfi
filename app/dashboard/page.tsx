'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet, formatBalance, formatUSD } from '@/app/lib/chain';
import { useUser, useBalance, useTransactions, useStreak } from '../lib/hooks';
import AppShell from '../components/shell/AppShell';
import { PageShell, Card, ActionTile } from '../components/ui/primitives';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  Users,
  Wallet,
  Trophy,
  FileText,
  Rocket,
} from 'lucide-react';

interface Transaction {
  _id: string;
  senderUsername: string;
  receiverUsername: string;
  amount: number;
  timestamp: string;
  txHash: string;
  senderAddress: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { ready, address: walletAddress, authenticated, isConnected } = useWallet();
  const { data: userData } = useUser();
  const { data: balance = 0 } = useBalance('USDC');
  const { data: recentTransactions = [] } = useTransactions(6);
  const { data: streakInfo } = useStreak();

  const isBusiness = userData?.accountType === 'business';
  const isLoading = userData === undefined;

  useEffect(() => {
    if (userData === null) router.replace('/onboarding');
  }, [userData, router]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (ready && !authenticated && !isConnected) router.replace('/');
    }, 500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Time-based greeting set after mount (avoids an SSR/client hydration mismatch).
  const [greeting, setGreeting] = useState('Welcome back');
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
  }, []);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="spinner" />
        </div>
      </AppShell>
    );
  }

  const name = userData?.displayName || (userData?.username ? `@${userData.username}` : 'there');

  const actions = isBusiness
    ? ([
        { href: '/transact?mode=receive', icon: ArrowDownLeft, title: 'Accept', subtitle: 'From customers', accent: 'emerald' },
        { href: '/business/payroll', icon: Users, title: 'Payroll', subtitle: 'Pay your team', accent: 'purple' },
        { href: '/invoices', icon: FileText, title: 'Invoice', subtitle: 'Bill a customer', accent: 'blue' },
        { href: '/shielded', icon: Shield, title: 'Private', subtitle: 'Shielded', accent: 'violet' },
      ] as const)
    : ([
        { href: '/', icon: ArrowUpRight, title: 'Send', subtitle: 'Pay anyone', accent: 'purple' },
        { href: '/transact?mode=receive', icon: ArrowDownLeft, title: 'Receive', subtitle: 'Get paid', accent: 'blue' },
        { href: '/shielded', icon: Shield, title: 'Private', subtitle: 'Shielded', accent: 'violet' },
        { href: '/contacts', icon: Users, title: 'Friends', subtitle: 'Contacts', accent: 'rose' },
      ] as const);

  return (
    <AppShell>
      <PageShell variant="wide">
        {/* Compact greeting — the balance is the hero, not this */}
        <div className="mb-6">
          <p className="text-sm text-purple-200/55">{greeting},</p>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{name}</h1>
        </div>

        {/* Balance */}
        <Card className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#7f13ec]/10 blur-3xl"
          />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm text-purple-200/55">
                <Wallet className="h-4 w-4 text-[#b07bff]" />
                {isBusiness ? 'Business balance' : 'Total balance'}
              </p>
              <p className="mt-2 text-4xl font-bold tabular-nums text-white sm:text-5xl">
                {formatBalance(balance)} <span className="text-xl font-medium text-purple-200/50">USDC</span>
              </p>
              <p className="mt-1 text-xs text-purple-200/45">{formatUSD(balance)}</p>
            </div>
            <Link href="/history" className="text-sm font-medium text-[#c89bff] transition-colors hover:text-white">
              View activity →
            </Link>
          </div>
          <div className="relative mt-6 flex gap-3">
            <Link
              href={isBusiness ? '/transact?mode=receive' : '/'}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] py-3 text-center font-semibold text-white shadow-lg shadow-[#7f13ec]/30 transition hover:shadow-[#7f13ec]/50"
            >
              {isBusiness ? 'Accept payment' : 'Send'}
            </Link>
            <Link
              href={isBusiness ? '/transact' : '/transact?mode=receive'}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-center font-semibold text-white transition hover:bg-white/[0.08]"
            >
              {isBusiness ? 'Send' : 'Receive'}
            </Link>
          </div>
        </Card>

        {/* Quick actions — glass tiles */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {actions.map((a) => (
            <ActionTile key={a.title} href={a.href} icon={a.icon} title={a.title} subtitle={a.subtitle} accent={a.accent} />
          ))}
        </div>

        {/* Rewards/summary + activity */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            {isBusiness ? (
              <>
                <h2 className="flex items-center gap-2 font-semibold text-white">
                  <Trophy className="h-4 w-4 text-[#b07bff]" /> Business summary
                </h2>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <Stat label="Transactions" value={streakInfo?.transferCount ?? 0} />
                  <Stat label="Received" value={formatBalance(userData?.totalReceived || 0)} />
                  <Stat label="Day streak" value={streakInfo?.streak ?? 0} />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-semibold text-white">
                    <Trophy className="h-4 w-4 text-[#b07bff]" /> Rewards
                  </h2>
                  <Link href="/rewards" className="text-xs font-medium text-[#c89bff] hover:text-white">
                    View →
                  </Link>
                </div>
                <p className="mt-4 text-sm text-purple-200/70">
                  {streakInfo?.currentMilestone?.name
                    ? `${streakInfo.currentMilestone.emoji ?? '🌱'} ${streakInfo.currentMilestone.name}`
                    : '🌱 Getting started'}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#9b3bff] to-[#c89bff] transition-all duration-500"
                    style={{
                      width: streakInfo?.nextMilestone
                        ? `${Math.min(((streakInfo.transferCount || 0) / streakInfo.nextMilestone.count) * 100, 100)}%`
                        : '100%',
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-purple-200/50">
                  {streakInfo?.nextMilestone
                    ? `${streakInfo.nextMilestone.count - (streakInfo.transferCount || 0)} transfers to ${streakInfo.nextMilestone.emoji ?? ''} ${streakInfo.nextMilestone.name}`
                    : 'Send your first transaction to start earning.'}
                </p>
              </>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">{isBusiness ? 'Recent payments' : 'Recent activity'}</h2>
              <Link href="/history" className="text-xs font-medium text-[#c89bff] hover:text-white">
                See all →
              </Link>
            </div>
            <div className="mt-4">
              {recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9b3bff]/10 text-[#b07bff]">
                    <Rocket className="h-6 w-6" />
                  </span>
                  <p className="mt-3 font-semibold text-white">No activity yet</p>
                  <p className="mt-1 max-w-[220px] text-sm text-purple-200/50">
                    {isBusiness ? 'Accept your first payment to see it here.' : 'Send your first payment to get started.'}
                  </p>
                  <Link
                    href={isBusiness ? '/transact?mode=receive' : '/'}
                    className="mt-4 rounded-xl bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] px-5 py-2 text-sm font-semibold text-white"
                  >
                    {isBusiness ? 'Accept payment' : 'Send now'}
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {(recentTransactions as Transaction[]).map((tx, i) => {
                    const sent = tx.senderAddress === walletAddress;
                    return (
                      <div
                        key={tx._id}
                        className="animate-rise-in flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-white/5"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-full ${
                              sent ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-emerald-300'
                            }`}
                          >
                            {sent ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {sent ? `To @${tx.receiverUsername}` : `From @${tx.senderUsername}`}
                            </p>
                            <p className="text-xs text-purple-200/45">
                              {new Date(tx.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-semibold tabular-nums ${sent ? 'text-rose-300' : 'text-emerald-300'}`}>
                          {sent ? '-' : '+'}
                          {tx.amount}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </PageShell>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
      <p className="text-xl font-bold tabular-nums text-white">{value}</p>
      <p className="mt-0.5 text-xs text-purple-200/50">{label}</p>
    </div>
  );
}
