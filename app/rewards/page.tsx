'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import DashboardLayout from '../components/DashboardLayout';
import { getStreakInfo, getUserByAddress } from '../lib/api';

const MILESTONES = [
  { name: 'Newcomer', emoji: '🌱', count: 0, reward: 0 },
  { name: 'Explorer', emoji: '🚀', count: 10, reward: 0.5 },
  { name: 'Trader', emoji: '💫', count: 25, reward: 1 },
  { name: 'Star', emoji: '⭐', count: 50, reward: 2 },
  { name: 'Champion', emoji: '🏆', count: 100, reward: 5 },
  { name: 'Legend', emoji: '👑', count: 250, reward: 10 },
  { name: 'Titan', emoji: '💎', count: 500, reward: 25 },
];

export default function RewardsPage() {
  const router = useRouter();
  const { user, authenticated } = usePrivy();
  const { account, connected } = useWallet();

  const [walletAddress, setWalletAddress] = useState('');
  const [username, setUsername] = useState('');
  const [streakInfo, setStreakInfo] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
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

  // Fetch data
  useEffect(() => {
    if (!walletAddress) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [streak, userInfo] = await Promise.all([
          getStreakInfo(walletAddress),
          getUserByAddress(walletAddress),
        ]);
        setStreakInfo(streak);
        setUserData(userInfo);
        if (userInfo) {
          setUsername(userInfo.username);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [walletAddress]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !connected) {
        router.replace('/');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Calculate progress to next milestone
  const transferCount = streakInfo?.transferCount || 0;
  const currentMilestoneIndex = MILESTONES.findIndex(
    (m, i) => i === MILESTONES.length - 1 || MILESTONES[i + 1].count > transferCount
  );
  const currentMilestone = MILESTONES[currentMilestoneIndex];
  const nextMilestone = MILESTONES[currentMilestoneIndex + 1];
  const progressToNext = nextMilestone
    ? ((transferCount - currentMilestone.count) / (nextMilestone.count - currentMilestone.count)) * 100
    : 100;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#191022]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <DashboardLayout username={username} walletAddress={walletAddress}>
      <div className="p-4 md:p-8 max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rewards</h1>
          <p className="text-slate-500 dark:text-[#ad92c9] text-sm">Track your progress and earn rewards</p>
        </div>

        <div className="space-y-6">
          {/* Current Status Card */}
          <div 
            className="rounded-2xl p-6 animate-fade-in-up overflow-hidden relative"
            style={{
              background: 'linear-gradient(135deg, #7f13ec 0%, #a855f7 50%, #6366f1 100%)',
              boxShadow: '0 20px 40px -15px rgba(127, 19, 236, 0.4)'
            }}
          >
            {/* Background decoration */}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/70 text-sm">Current Level</p>
                  <p className="text-3xl font-black text-white flex items-center gap-2">
                    <span>{currentMilestone.emoji}</span>
                    <span>{currentMilestone.name}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-sm">Transfers</p>
                  <p className="text-3xl font-black text-white">{transferCount}</p>
                </div>
              </div>

              {nextMilestone && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/70">Progress to {nextMilestone.name}</span>
                    <span className="text-white font-bold">
                      {nextMilestone.count - transferCount} more
                    </span>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-1000"
                      style={{ width: `${progressToNext}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Streak Card */}
          <div className="bg-white dark:bg-[#251a30] rounded-2xl p-6 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-[#ad92c9] text-sm">Daily Streak</p>
                <p className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  🔥 {streakInfo?.streak || 0}
                  <span className="text-lg font-normal text-slate-500 dark:text-[#ad92c9]">days</span>
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-3xl">
                  {(streakInfo?.streak || 0) >= 7 ? '🌟' : (streakInfo?.streak || 0) >= 3 ? '⚡' : '🔥'}
                </span>
              </div>
            </div>
            <p className="text-slate-400 dark:text-[#ad92c9]/60 text-sm mt-4">
              {streakInfo?.streak === 0
                ? 'Make a transfer today to start your streak!'
                : `Keep it up! Transfer daily to maintain your streak.`}
            </p>
          </div>

          {/* Milestones */}
          <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Milestones</h3>
            <div className="space-y-3">
              {MILESTONES.map((milestone, index) => {
                const isCompleted = transferCount >= milestone.count;
                const isCurrent = index === currentMilestoneIndex;
                const isLocked = !isCompleted && !isCurrent;

                return (
                  <div
                    key={milestone.name}
                    className={`bg-white dark:bg-[#251a30] rounded-2xl p-4 flex items-center gap-4 border shadow-sm dark:shadow-none ${
                      isCurrent ? 'border-[#7f13ec]' : 'border-slate-200 dark:border-white/5'
                    } ${isLocked ? 'opacity-50' : ''}`}
                    style={{ boxShadow: isCurrent ? '0 0 30px rgba(127, 19, 236, 0.2)' : undefined }}
                  >
                    <div 
                      className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                        isCompleted 
                          ? 'bg-emerald-500/20' 
                          : isCurrent 
                            ? 'bg-[#7f13ec]/20' 
                            : 'bg-slate-100 dark:bg-white/5'
                      }`}
                    >
                      {isCompleted ? '✅' : milestone.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-bold ${isCompleted || isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-[#ad92c9]'}`}>
                          {milestone.name}
                        </p>
                        {isCurrent && (
                          <span className="badge badge-primary text-xs">Current</span>
                        )}
                      </div>
                      <p className="text-slate-400 dark:text-[#ad92c9]/60 text-sm">
                        {milestone.count === 0 
                          ? 'Starting level' 
                          : `${milestone.count} transfers`}
                      </p>
                    </div>
                    {milestone.reward > 0 && (
                      <div className="text-right">
                        <p className={`font-bold ${isCompleted ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500 dark:text-[#ad92c9]'}`}>
                          +{milestone.reward} MOVE
                        </p>
                        <p className="text-slate-400 dark:text-[#ad92c9]/60 text-xs">
                          {isCompleted ? 'Earned' : 'Reward'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Your Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-[#251a30] rounded-2xl p-4 text-center border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{userData?.totalSent || 0}</p>
                <p className="text-slate-500 dark:text-[#ad92c9] text-sm">MOVE Sent</p>
              </div>
              <div className="bg-white dark:bg-[#251a30] rounded-2xl p-4 text-center border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{userData?.totalReceived || 0}</p>
                <p className="text-slate-500 dark:text-[#ad92c9] text-sm">MOVE Received</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
