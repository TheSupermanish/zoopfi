'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, formatBalance, formatUSD } from '@/app/lib/chain';
import { useUser, useBalance, useTransactions, useStreak } from '../lib/hooks';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
import PersonalHeroSection from '../components/dashboard/PersonalHeroSection';
import BusinessHeroSection from '../components/dashboard/BusinessHeroSection';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  Users,
  CreditCard,
  BarChart3,
  Wallet,
  Briefcase,
  TrendingUp,
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
  const { address: walletAddress, authenticated, isConnected } = useWallet();

  // Cached app-wide (TanStack Query): shared across pages, polled for balance/tx
  // so navigating back is instant (no refetch spinner) and balances stay live.
  const { data: userData } = useUser();
  const { data: balance = 0 } = useBalance('USDC');
  const { data: recentTransactions = [] } = useTransactions(5);
  const { data: streakInfo } = useStreak();

  const isBusiness = userData?.accountType === 'business';
  const isLoading = userData === undefined; // only blocks on first load; cached after

  // Not registered yet -> onboarding.
  useEffect(() => {
    if (userData === null) router.replace('/onboarding');
  }, [userData, router]);

  // Not connected -> home.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !isConnected) {
        router.replace('/');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#191022]">
        <div className="spinner" />
      </div>
    );
  }

  // Personal quick actions
  const personalQuickActions = [
    {
      href: '/transact',
      Icon: ArrowUpRight,
      title: 'Send',
      subtitle: 'Transfer crypto',
      gradient: 'from-[#7f13ec] to-[#5b0ba8]',
      shadow: 'shadow-[#7f13ec]/20',
    },
    {
      href: '/transact?mode=receive',
      Icon: ArrowDownLeft,
      title: 'Receive',
      subtitle: 'Get paid easily',
      gradient: 'from-blue-600 to-indigo-700',
      shadow: 'shadow-blue-500/20',
    },
    {
      href: '/private',
      Icon: Shield,
      title: 'Private',
      subtitle: 'Shielded payments',
      gradient: 'from-violet-600 to-fuchsia-700',
      shadow: 'shadow-violet-500/20',
    },
    {
      href: '/contacts',
      Icon: Users,
      title: 'Friends',
      subtitle: 'Manage contacts',
      gradient: 'from-pink-600 to-rose-700',
      shadow: 'shadow-pink-500/20',
    },
  ];

  // Business quick actions
  const businessQuickActions = [
    {
      href: '/transact?mode=receive',
      Icon: CreditCard,
      title: 'Accept Payment',
      subtitle: 'From customers',
      gradient: 'from-purple-600 to-purple-800',
      shadow: 'shadow-purple-500/20',
    },
    {
      href: '/private',
      Icon: Shield,
      title: 'Private',
      subtitle: 'Shielded payments',
      gradient: 'from-violet-600 to-fuchsia-700',
      shadow: 'shadow-violet-500/20',
    },
    {
      href: '/history',
      Icon: BarChart3,
      title: 'Analytics',
      subtitle: 'View reports',
      gradient: 'from-fuchsia-600 to-pink-700',
      shadow: 'shadow-fuchsia-500/20',
    },
    {
      href: '/contacts',
      Icon: Users,
      title: 'Customers',
      subtitle: 'Manage clients',
      gradient: 'from-rose-600 to-red-700',
      shadow: 'shadow-rose-500/20',
    },
  ];

  const quickActions = isBusiness ? businessQuickActions : personalQuickActions;

  return (
    <DashboardLayout 
      username={userData?.username} 
      walletAddress={walletAddress}
      accountType={userData?.accountType}
      displayName={userData?.displayName}
      avatarUrl={userData?.avatarUrl}
    >
      <div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8 max-w-[1400px] mx-auto w-full">
        
        {/* Hero Section - Conditional based on account type */}
        {isBusiness ? (
          <BusinessHeroSection 
            userData={userData}
            walletAddress={walletAddress}
            balance={balance}
            streakInfo={streakInfo}
          />
        ) : (
          <PersonalHeroSection 
            userData={userData}
            walletAddress={walletAddress}
            balance={balance}
            streakInfo={streakInfo}
          />
        )}

        {/* Quick Actions - Adapts to account type */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
          <Link 
              key={action.href + action.title}
              href={action.href}
              className={`group relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${action.gradient} hover:scale-[1.02] transition-all duration-300 shadow-lg ${action.shadow}`}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl translate-x-5 -translate-y-5" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <action.Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                  <h3 className="font-bold text-white text-lg">{action.title}</h3>
                  <p className="text-white/70 text-sm">{action.subtitle}</p>
              </div>
            </div>
          </Link>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Balance Card + Progress */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Big Balance Card */}
            <div className={`relative overflow-hidden bg-white dark:bg-[#251a30] rounded-3xl p-8 border shadow-sm dark:shadow-none ${
              isBusiness 
                ? 'border-purple-500/20 dark:border-purple-500/10' 
                : 'border-slate-200 dark:border-white/5'
            }`}>
              <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] ${
                isBusiness 
                  ? 'bg-purple-600/5 dark:bg-purple-600/10' 
                  : 'bg-[#7f13ec]/5 dark:bg-[#7f13ec]/10'
              }`} />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                      isBusiness 
                        ? 'bg-gradient-to-br from-purple-600 to-purple-400 shadow-purple-600/30' 
                        : 'bg-gradient-to-br from-[#7f13ec] to-[#a855f7] shadow-[#7f13ec]/30'
                    }`}>
                      {isBusiness ? (
                        <Briefcase className="w-6 h-6 text-white" />
                      ) : (
                        <Wallet className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-[#ad92c9] text-sm">
                        {isBusiness ? 'Business Balance' : 'Total Balance'}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-[#ad92c9]/60">{formatUSD(balance)}</p>
                    </div>
                  </div>
                  <Link href="/history" className={`text-sm font-bold hover:underline ${
                    isBusiness ? 'text-purple-600' : 'text-[#7f13ec]'
                  }`}>
                    View History →
                  </Link>
                </div>
                
                <h2 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white mb-6">
                  {formatBalance(balance)} <span className="text-2xl text-slate-400 dark:text-[#ad92c9]">USDC</span>
                </h2>
                
                <div className="flex gap-3">
                  {isBusiness ? (
                    <>
                      <Link 
                        href="/transact?mode=receive"
                        className="flex-1 h-14 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        Accept Payment <span>←</span>
                      </Link>
                      <Link 
                        href="/transact"
                        className="flex-1 h-14 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-white/10"
                      >
                        Send <span>→</span>
                      </Link>
                    </>
                  ) : (
                    <>
                  <Link 
                    href="/transact"
                    className="flex-1 h-14 rounded-xl bg-[#7f13ec] hover:bg-[#6a10c7] text-white font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    Send <span>→</span>
                  </Link>
                  <Link 
                    href="/transact?mode=receive"
                    className="flex-1 h-14 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-white/10"
                  >
                    Receive <span>←</span>
                  </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Progress/Rewards Card (Personal only) OR Business Stats (Business only) */}
            {isBusiness ? (
              <div className="bg-white dark:bg-[#251a30] rounded-2xl p-6 border border-purple-500/20 dark:border-purple-500/10 shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Business Summary</h3>
                      <p className="text-slate-500 dark:text-[#ad92c9] text-sm">
                        Your payment activity overview
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10">
                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                      {streakInfo?.transferCount || 0}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-purple-300/60">Transactions</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {formatBalance(userData?.totalReceived || 0)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-emerald-300/60">Total Received</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                      {streakInfo?.streak || 0}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-amber-300/60">Day Streak</p>
                  </div>
                </div>
              </div>
            ) : streakInfo && (
              <Link 
                href="/rewards"
                className="bg-white dark:bg-[#251a30] rounded-2xl p-6 border border-slate-200 dark:border-white/5 hover:border-[#7f13ec]/30 transition-all group shadow-sm dark:shadow-none"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{streakInfo.currentMilestone?.emoji || '🌱'}</div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{streakInfo.currentMilestone?.name || 'Getting Started'}</h3>
                      <p className="text-slate-500 dark:text-[#ad92c9] text-sm">
                        {streakInfo.nextMilestone 
                          ? `${streakInfo.nextMilestone.count - (streakInfo.transferCount || 0)} transfers to ${streakInfo.nextMilestone.emoji} ${streakInfo.nextMilestone.name}`
                          : 'Maximum level reached!'}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-400 dark:text-[#ad92c9] group-hover:text-[#7f13ec] transition-colors">→</span>
                </div>
                
                <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#7f13ec] to-[#a855f7] h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: streakInfo.nextMilestone 
                        ? `${Math.min((streakInfo.transferCount || 0) / streakInfo.nextMilestone.count * 100, 100)}%`
                        : '100%'
                    }}
                  />
                </div>
              </Link>
            )}
          </div>

          {/* Right: Activity Feed */}
          <div className="lg:col-span-5">
            <div className={`bg-white dark:bg-[#251a30] rounded-2xl border h-full flex flex-col shadow-sm dark:shadow-none ${
              isBusiness 
                ? 'border-purple-500/20 dark:border-purple-500/10' 
                : 'border-slate-200 dark:border-white/5'
            }`}>
              <div className={`p-6 border-b flex items-center justify-between ${
                isBusiness 
                  ? 'border-purple-500/20 dark:border-purple-500/10' 
                  : 'border-slate-200 dark:border-white/5'
              }`}>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  {isBusiness ? 'Recent Payments' : 'Recent Activity'}
                </h3>
                <Link 
                  href="/history"
                  className={`text-xs font-bold hover:underline ${
                    isBusiness ? 'text-purple-600' : 'text-[#7f13ec]'
                  }`}
                >
                  See All
                </Link>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                {recentTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                      isBusiness ? 'bg-purple-500/10' : 'bg-[#7f13ec]/10'
                    }`}>
                      {isBusiness ? (
                        <CreditCard className="w-7 h-7 text-purple-500" />
                      ) : (
                        <Rocket className="w-7 h-7 text-[#7f13ec]" />
                      )}
                    </div>
                    <p className="text-slate-900 dark:text-white font-bold">
                      {isBusiness ? 'No payments yet' : 'No activity yet'}
                    </p>
                    <p className="text-slate-500 dark:text-[#ad92c9] text-sm mt-1 max-w-[200px]">
                      {isBusiness 
                        ? 'Start accepting payments from your customers!' 
                        : 'Send your first transaction to start building your streak!'}
                    </p>
                    <Link 
                      href={isBusiness ? '/transact?mode=receive' : '/transact'}
                      className={`mt-4 px-6 py-2 rounded-xl text-white text-sm font-bold transition-colors ${
                        isBusiness 
                          ? 'bg-purple-600 hover:bg-purple-700' 
                          : 'bg-[#7f13ec] hover:bg-[#6a10c7]'
                      }`}
                    >
                      {isBusiness ? 'Get Started' : 'Send Now'}
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recentTransactions.map((tx: Transaction, index: number) => {
                      const isSent = tx.senderAddress === walletAddress;
                      return (
                        <div 
                          key={tx._id} 
                          className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer animate-fade-in-up"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isSent 
                                ? 'bg-red-500/10 text-red-400' 
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {isSent ? (
                                <ArrowUpRight className="w-5 h-5" />
                              ) : (
                                <ArrowDownLeft className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <p className="text-slate-900 dark:text-white font-medium text-sm">
                                {isBusiness 
                                  ? (isSent ? `Paid to @${tx.receiverUsername}` : `Payment from @${tx.senderUsername}`)
                                  : (isSent ? `To @${tx.receiverUsername}` : `From @${tx.senderUsername}`)}
                              </p>
                              <p className="text-slate-500 dark:text-[#ad92c9] text-xs">
                                {new Date(tx.timestamp).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                          <p className={`font-bold ${isSent ? 'text-red-400' : 'text-emerald-400'}`}>
                            {isSent ? '-' : '+'}{tx.amount}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
