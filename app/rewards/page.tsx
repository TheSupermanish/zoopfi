'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/app/lib/chain';
import { useUser, useStreak } from '@/app/lib/hooks';
import AppShell from '../components/shell/AppShell';
import { PageShell, PageHeader, Card, StatTile } from '../components/ui/primitives';
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
  ArrowUpRight,
  ArrowDownLeft,
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
  const { ready, authenticated, isConnected } = useWallet();

  const { data: userData } = useUser();
  const { data: streakInfo } = useStreak();
  const isLoading = userData === undefined;

  // Redirect if not registered
  useEffect(() => {
    if (userData === null) router.replace('/onboarding');
  }, [userData, router]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ready && !authenticated && !isConnected) {
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
      <PageShell variant="wide">
        <PageHeader
          title="Rewards"
          subtitle="Track your progress and earn rewards"
          icon={Trophy}
          accent="amber"
        />

        <div className="space-y-6">
          {/* Current Status */}
          <Card className="relative overflow-hidden animate-fade-in-up">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#7f13ec]/10 blur-3xl"
            />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-purple-200/60">Current Level</p>
                  <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#9b3bff]/15 text-[#c89bff]">
                      <currentMilestone.Icon className="h-5 w-5" />
                    </span>
                    <span>{currentMilestone.name}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-purple-200/60">Transfers</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-white sm:text-3xl">{transferCount}</p>
                </div>
              </div>

              {nextMilestone && (
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-purple-200/60">Progress to {nextMilestone.name}</span>
                    <span className="font-semibold text-white">
                      {nextMilestone.count - transferCount} more
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#9b3bff] to-[#c89bff] transition-all duration-1000"
                      style={{ width: `${progressToNext}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Streak */}
          <Card className="animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-200/60">Daily Streak</p>
                <p className="mt-1 flex items-center gap-3 text-4xl font-bold tabular-nums text-white">
                  <Flame className="h-10 w-10 text-amber-400" /> {streakInfo?.streak || 0}
                  <span className="text-lg font-normal text-purple-200/60">days</span>
                </p>
              </div>
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
                {(() => {
                  const streak = streakInfo?.streak || 0;
                  const StreakIcon = streak >= 7 ? Star : streak >= 3 ? Zap : Flame;
                  return <StreakIcon className="h-7 w-7" />;
                })()}
              </span>
            </div>
            <p className="mt-4 text-sm text-purple-200/60">
              {streakInfo?.streak === 0
                ? 'Make a transfer today to start your streak!'
                : `Keep it up! Transfer daily to maintain your streak.`}
            </p>
          </Card>

          {/* Milestones */}
          <div className="animate-fade-in-up">
            <h2 className="mb-4 text-base font-semibold text-white">Milestones</h2>
            <div className="space-y-3">
              {MILESTONES.map((milestone, index) => {
                const isCompleted = transferCount >= milestone.count;
                const isCurrent = index === currentMilestoneIndex;
                const isLocked = !isCompleted && !isCurrent;

                return (
                  <Card
                    key={milestone.name}
                    className={`flex items-center gap-4 ${isCurrent ? 'border-[#9b3bff]/60' : ''} ${isLocked ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : isCurrent
                            ? 'bg-[#9b3bff]/15 text-[#c89bff]'
                            : 'bg-white/5 text-purple-200/60'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <milestone.Icon className="h-6 w-6" />
                      )}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold ${isCompleted || isCurrent ? 'text-white' : 'text-purple-200/60'}`}>
                          {milestone.name}
                        </p>
                        {isCurrent && (
                          <span className="badge badge-primary text-xs">Current</span>
                        )}
                      </div>
                      <p className="text-sm text-purple-200/60">
                        {milestone.count === 0
                          ? 'Starting level'
                          : `${milestone.count} transfers`}
                      </p>
                    </div>
                    {milestone.reward > 0 && (
                      <div className="text-right">
                        <p className={`font-semibold ${isCompleted ? 'text-emerald-300' : 'text-purple-200/60'}`}>
                          +{milestone.reward} USDC
                        </p>
                        <p className="text-xs text-purple-200/60">
                          {isCompleted ? 'Earned' : 'Reward'}
                        </p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="animate-fade-in-up">
            <h2 className="mb-4 text-base font-semibold text-white">Your Stats</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="USDC Sent" value={userData?.totalSent || 0} icon={ArrowUpRight} accent="rose" />
              <StatTile label="USDC Received" value={userData?.totalReceived || 0} icon={ArrowDownLeft} accent="emerald" />
            </div>
          </div>
        </div>
      </PageShell>
    </AppShell>
  );
}
