'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
import NotificationBell from '../components/NotificationBell';
import { fetchBalance, formatBalance, formatUSD } from '../lib/balance';
import { getUserByAddress, getTransactions, getStreakInfo } from '../lib/api';

interface UserData {
  username: string;
  walletAddress: string;
  streak: number;
  transferCount: number;
}

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
  const { user, authenticated, logout: privyLogout } = usePrivy();
  const { account, connected, disconnect } = useWallet();
  
  const [walletAddress, setWalletAddress] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [balance, setBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [streakInfo, setStreakInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get wallet address
  useEffect(() => {
    if (authenticated && user) {
      const moveWallet = user.linkedAccounts?.find(
        (acc: any) => acc.chainType === 'aptos'
      ) as any;
      if (moveWallet?.address) {
        setWalletAddress(moveWallet.address);
      }
    } else if (connected && account?.address) {
      setWalletAddress(account.address.toString());
    }
  }, [authenticated, user, connected, account]);

  // Fetch all data
  useEffect(() => {
    if (!walletAddress) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch user data
        const userResult = await getUserByAddress(walletAddress);
        if (!userResult) {
          router.replace('/onboarding');
          return;
        }
        setUserData(userResult);

        // Fetch balance, transactions, streak in parallel
        const [bal, txResult, streak] = await Promise.all([
          fetchBalance(walletAddress),
          getTransactions(walletAddress, 5, 0),
          getStreakInfo(walletAddress),
        ]);
        
        setBalance(bal);
        setRecentTransactions(txResult.transactions || []);
        setStreakInfo(streak);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [walletAddress]);

  // Redirect if not connected (only once on mount)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !connected) {
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return { text: 'Late night', emoji: '🌙', vibe: "burning the midnight oil?" };
    if (hour < 12) return { text: 'Good morning', emoji: '☀️', vibe: "ready to make moves?" };
    if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️', vibe: "let's get things done!" };
    if (hour < 21) return { text: 'Good evening', emoji: '🌅', vibe: "winding down?" };
    return { text: 'Good night', emoji: '🌃', vibe: "one more transaction?" };
  };

  const greeting = getGreeting();

  return (
    <DashboardLayout username={userData?.username} walletAddress={walletAddress}>
      <div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8 max-w-[1400px] mx-auto w-full">
        
        {/* Hero Section - Immersive Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl min-h-[320px] md:min-h-[380px]">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a40] via-[#1a1030] to-[#0f0820]" />
          
          {/* Animated Gradient Orbs */}
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#7f13ec]/30 blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-[-30%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#a855f7]/20 blur-[100px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
          <div className="absolute top-[20%] left-[30%] w-[200px] h-[200px] rounded-full bg-blue-500/10 blur-[80px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
          
          {/* Mesh Pattern Overlay */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(127, 19, 236, 0.1) 0%, transparent 50%), 
                              radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)`,
          }} />
          
          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${3 + i * 0.5}s`,
                }}
              />
            ))}
          </div>
          
          {/* Content */}
          <div className="relative z-10 h-full p-6 md:p-10 flex flex-col">
            {/* Top Row: Badge + Notification */}
            <div className="flex items-start justify-between mb-auto">
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium text-white/80">Movement Network</span>
                </div>
                {streakInfo?.streak > 0 && (
                  <div className="px-3 py-1.5 rounded-full bg-[#7f13ec]/20 backdrop-blur-sm border border-[#7f13ec]/30 flex items-center gap-2">
                    <span className="text-sm">🔥</span>
                    <span className="text-xs font-bold text-[#7f13ec]">{streakInfo.streak} day streak</span>
                  </div>
                )}
              </div>
              <div className="hidden lg:flex">
                <NotificationBell walletAddress={walletAddress} />
              </div>
            </div>

            {/* Main Greeting */}
            <div className="flex-1 flex flex-col justify-center overflow-visible">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{greeting.emoji}</span>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight">
                  {greeting.text},
                </h1>
              </div>
              <h2 
                className="text-3xl md:text-5xl lg:text-6xl font-black text-transparent w-fit pr-2"
                style={{
                  background: 'linear-gradient(to right, #ffffff, #e9d5ff, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                @{userData?.username}
              </h2>
              <p className="text-[#ad92c9] text-lg mt-3 max-w-md">
                {greeting.vibe} {streakInfo?.transferCount > 0 
                  ? `You've made ${streakInfo.transferCount} transfers so far!`
                  : 'Ready to make your first move?'}
              </p>
            </div>

            {/* Bottom Stats Cards - Floating on Banner */}
            <div className="flex flex-wrap gap-3 mt-6">
              <div className="px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7f13ec] to-[#a855f7] flex items-center justify-center">
                  <span className="text-white text-lg">💰</span>
                </div>
                <div>
                  <p className="text-[#ad92c9] text-xs">Balance</p>
                  <p className="text-white font-bold">{formatBalance(balance)} MOVE</p>
                </div>
              </div>
              
              <div className="px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <span className="text-white text-lg">📊</span>
                </div>
                <div>
                  <p className="text-[#ad92c9] text-xs">Transfers</p>
                  <p className="text-white font-bold">{streakInfo?.transferCount || 0}</p>
                </div>
              </div>
              
              <div className="px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <span className="text-white text-lg">{streakInfo?.currentMilestone?.emoji || '🌱'}</span>
                </div>
                <div>
                  <p className="text-[#ad92c9] text-xs">Rank</p>
                  <p className="text-white font-bold">{streakInfo?.currentMilestone?.name || 'Newcomer'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Full Width Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link 
            href="/transact"
            className="group relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#7f13ec] to-[#5b0ba8] hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-[#7f13ec]/20"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl translate-x-5 -translate-y-5" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-2xl">📤</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Send</h3>
                <p className="text-white/70 text-sm">Transfer crypto</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/transact?mode=receive"
            className="group relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-600 to-indigo-700 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-blue-500/20"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl translate-x-5 -translate-y-5" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-2xl">📥</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Receive</h3>
                <p className="text-white/70 text-sm">Get paid easily</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/transact?mode=receive"
            className="group relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-600 to-teal-700 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-emerald-500/20"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl translate-x-5 -translate-y-5" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-2xl">💸</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Request</h3>
                <p className="text-white/70 text-sm">Ask for payment</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/contacts"
            className="group relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-pink-600 to-rose-700 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-pink-500/20"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl translate-x-5 -translate-y-5" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Friends</h3>
                <p className="text-white/70 text-sm">Manage contacts</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Balance Card + Progress */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Big Balance Card */}
            <div className="relative overflow-hidden bg-white dark:bg-[#251a30] rounded-3xl p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#7f13ec]/5 dark:bg-[#7f13ec]/10 rounded-full blur-[80px]" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7f13ec] to-[#a855f7] flex items-center justify-center shadow-lg shadow-[#7f13ec]/30">
                      <span className="text-2xl">💎</span>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-[#ad92c9] text-sm">Total Balance</p>
                      <p className="text-xs text-slate-400 dark:text-[#ad92c9]/60">{formatUSD(balance)}</p>
                    </div>
                  </div>
                  <Link href="/history" className="text-[#7f13ec] text-sm font-bold hover:underline">
                    View History →
                  </Link>
                </div>
                
                <h2 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white mb-6">
                  {formatBalance(balance)} <span className="text-2xl text-slate-400 dark:text-[#ad92c9]">MOVE</span>
                </h2>
                
                <div className="flex gap-3">
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
                </div>
              </div>
            </div>

            {/* Progress/Rewards Card */}
            {streakInfo && (
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
            <div className="bg-white dark:bg-[#251a30] rounded-2xl border border-slate-200 dark:border-white/5 h-full flex flex-col shadow-sm dark:shadow-none">
              <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Recent Activity</h3>
                <Link 
                  href="/history"
                  className="text-xs font-bold text-[#7f13ec] hover:underline"
                >
                  See All
                </Link>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                {recentTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#7f13ec]/10 flex items-center justify-center mb-4">
                      <span className="text-3xl">🚀</span>
                    </div>
                    <p className="text-slate-900 dark:text-white font-bold">No activity yet</p>
                    <p className="text-slate-500 dark:text-[#ad92c9] text-sm mt-1 max-w-[200px]">
                      Send your first transaction to start building your streak!
                    </p>
                    <Link 
                      href="/transact"
                      className="mt-4 px-6 py-2 rounded-xl bg-[#7f13ec] text-white text-sm font-bold hover:bg-[#6a10c7] transition-colors"
                    >
                      Send Now
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recentTransactions.map((tx, index) => {
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
                              <span>{isSent ? '↗' : '↙'}</span>
                            </div>
                            <div>
                              <p className="text-slate-900 dark:text-white font-medium text-sm">
                                {isSent ? `To @${tx.receiverUsername}` : `From @${tx.senderUsername}`}
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
