'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/app/lib/chain';
import { useUser, useStreak } from '@/app/lib/hooks';
import AppShell from '../components/shell/AppShell';
import {
  Sprout,
  Rocket,
  Sparkles,
  Star,
  Trophy,
  Crown,
  Gem,
  Flame,
  Zap,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

const MILESTONES: { name: string; Icon: LucideIcon; count: number; reward: number }[] = [
  { name: 'Newcomer', Icon: Sprout, count: 0, reward: 0 },
  { name: 'Explorer', Icon: Rocket, count: 10, reward: 0.5 },
  { name: 'Trader', Icon: Sparkles, count: 25, reward: 1 },
  { name: 'Star', Icon: Star, count: 50, reward: 2 },
  { name: 'Champion', Icon: Trophy, count: 100, reward: 5 },
  { name: 'Legend', Icon: Crown, count: 250, reward: 10 },
  { name: 'Titan', Icon: Gem, count: 500, reward: 25 },
];

export default function RewardsPage() {
  const router = useRouter();
  const { address: walletAddress, authenticated, isConnected } = useWallet();

  const { data: userData } = useUser();
  const { data: streakInfo } = useStreak();
  const username = userData?.username ?? '';
  const isLoading = userData === undefined;

  // Redirect if not registered
  useEffect(() => {
    if (userData === null) router.replace('/onboarding');
  }, [userData, router]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !isConnected) {
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-transparent">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AppShell>
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
                    <currentMilestone.Icon className="w-7 h-7" />
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
          <div className="bg-white dark:bg-white/[0.04] rounded-2xl p-6 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-[#ad92c9] text-sm">Daily Streak</p>
                <p className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Flame className="w-10 h-10 text-amber-500" /> {streakInfo?.streak || 0}
                  <span className="text-lg font-normal text-slate-500 dark:text-[#ad92c9]">days</span>
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                {(() => {
                  const streak = streakInfo?.streak || 0;
                  const StreakIcon = streak >= 7 ? Star : streak >= 3 ? Zap : Flame;
                  return <StreakIcon className="w-7 h-7 text-amber-500" />;
                })()}
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
                    className={`bg-white dark:bg-white/[0.04] rounded-2xl p-4 flex items-center gap-4 border shadow-sm dark:shadow-none ${
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
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <milestone.Icon className={`w-6 h-6 ${isCurrent ? 'text-[#7f13ec]' : 'text-slate-400 dark:text-[#ad92c9]'}`} />
                      )}
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
                          +{milestone.reward} USDC
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
              <div className="bg-white dark:bg-white/[0.04] rounded-2xl p-4 text-center border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{userData?.totalSent || 0}</p>
                <p className="text-slate-500 dark:text-[#ad92c9] text-sm">USDC Sent</p>
              </div>
              <div className="bg-white dark:bg-white/[0.04] rounded-2xl p-4 text-center border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{userData?.totalReceived || 0}</p>
                <p className="text-slate-500 dark:text-[#ad92c9] text-sm">USDC Received</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
