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
  ArrowUpRight,
  ArrowDownLeft,
  BadgeCheck,
  Award,
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

  const streak = streakInfo?.streak || 0;
  const StreakIcon = streak >= 7 ? Star : streak >= 3 ? Zap : Flame;

  return (
    <AppShell>
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-8%] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[#7f13ec]/14 blur-[150px]" />
        <div className="absolute right-[-8%] bottom-[10%] h-[28rem] w-[28rem] rounded-full bg-amber-500/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-amber-500/35 blur-2xl animate-pulse-glow" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-500/40">
              <Trophy className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="bg-gradient-to-r from-white via-amber-100 to-[#c89bff] bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Rewards
          </h1>
          <p className="mt-3 max-w-md text-balance text-sm text-purple-200/70 sm:text-base">
            Track your progress, keep your streak alive, and earn USDC as you climb.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {([
              [Award, currentMilestone.name],
              [Flame, `${streak}-day streak`],
              [BadgeCheck, `${transferCount} transfers`],
            ] as [LucideIcon, string][]).map(([Icon, label], i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-purple-100/80"
              >
                <Icon className="h-3.5 w-3.5 text-amber-300/80" /> {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-9 space-y-6">
          {/* Current Status — hero card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 shadow-2xl shadow-black/40 animate-fade-in sm:p-7">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl"
            />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-purple-200/55">Current Level</p>
                  <p className="mt-2 flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-500/30">
                      <currentMilestone.Icon className="h-6 w-6" />
                    </span>
                    <span>{currentMilestone.name}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-purple-200/55">Transfers</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-white sm:text-4xl">{transferCount}</p>
                </div>
              </div>

              {nextMilestone && (
                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-purple-200/60">Progress to {nextMilestone.name}</span>
                    <span className="font-semibold text-white tabular-nums">
                      {nextMilestone.count - transferCount} more
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-black/30">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000"
                      style={{ width: `${progressToNext}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Streak */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 shadow-2xl shadow-black/40 animate-fade-in sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-purple-200/55">Daily Streak</p>
                <p className="mt-2 flex items-center gap-3 text-4xl font-bold tabular-nums text-white">
                  <Flame className="h-10 w-10 text-amber-400" /> {streak}
                  <span className="text-lg font-normal text-purple-200/55">days</span>
                </p>
              </div>
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-500/30">
                <StreakIcon className="h-7 w-7" />
              </span>
            </div>
            <p className="mt-4 text-sm text-purple-200/60">
              {streak === 0
                ? 'Make a transfer today to start your streak!'
                : `Keep it up! Transfer daily to maintain your streak.`}
            </p>
          </div>

          {/* Milestones */}
          <div className="animate-fade-in">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-purple-100/80">Milestones</h2>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <div className="space-y-3">
              {MILESTONES.map((milestone, index) => {
                const isCompleted = transferCount >= milestone.count;
                const isCurrent = index === currentMilestoneIndex;
                const isLocked = !isCompleted && !isCurrent;

                return (
                  <div
                    key={milestone.name}
                    className={`group flex items-center gap-4 rounded-2xl border p-4 transition hover:-translate-y-1 ${
                      isCurrent
                        ? 'border-amber-500/40 bg-amber-500/[0.06]'
                        : 'border-white/10 bg-white/[0.03]'
                    } ${isLocked ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg ${
                        isCompleted
                          ? 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white'
                          : isCurrent
                            ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white'
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
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-purple-200/60">
                        {milestone.count === 0 ? 'Starting level' : `${milestone.count} transfers`}
                      </p>
                    </div>
                    {milestone.reward > 0 && (
                      <div className="text-right">
                        <p className={`font-semibold tabular-nums ${isCompleted ? 'text-emerald-300' : 'text-purple-200/60'}`}>
                          +{milestone.reward} USDC
                        </p>
                        <p className="text-xs text-purple-200/60">{isCompleted ? 'Earned' : 'Reward'}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="animate-fade-in">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-purple-100/80">Your Stats</h2>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-1">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 text-white shadow-lg">
                  <ArrowUpRight className="h-5 w-5" />
                </span>
                <p className="mt-3 text-2xl font-bold tabular-nums text-white">{userData?.totalSent || 0}</p>
                <p className="text-xs text-purple-200/55">USDC Sent</p>
              </div>
              <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-1">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg">
                  <ArrowDownLeft className="h-5 w-5" />
                </span>
                <p className="mt-3 text-2xl font-bold tabular-nums text-white">{userData?.totalReceived || 0}</p>
                <p className="text-xs text-purple-200/55">USDC Received</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
