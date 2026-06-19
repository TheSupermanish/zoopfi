export const runtime = 'nodejs';
import { handler, ok, bad, body, q } from '@/app/lib/server/route-utils';
import { User } from '@/app/lib/server/models';

// GET /api/backend/rewards/streak - Get streak info for a wallet
export const GET = handler(async (req: Request) => {
  const address = q(req, 'address');

  if (!address) {
    return bad('Wallet address is required', 400);
  }

  const user = await User.findOne({ walletAddress: address });
  if (!user) {
    return bad('User not found', 404);
  }

  // Calculate if streak is still active (within last 48 hours)
  const now = new Date();
  const lastActivity = user.lastActivityDate;
  let isStreakActive = false;
  let hoursRemaining = 0;

  if (lastActivity) {
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    isStreakActive = hoursSinceActivity < 48;
    hoursRemaining = Math.max(0, 48 - hoursSinceActivity);
  }

  // Milestones
  const milestones = [
    { count: 10, name: 'Getting Started', emoji: '🌱' },
    { count: 50, name: 'Active User', emoji: '⚡' },
    { count: 100, name: 'Power User', emoji: '💎' },
    { count: 500, name: 'Super User', emoji: '👑' },
  ];

  const currentMilestone = milestones
    .filter(m => user.transferCount >= m.count)
    .pop();

  const nextMilestone = milestones
    .find(m => user.transferCount < m.count);

  return ok({
    streak: isStreakActive ? user.streak : 0,
    isStreakActive,
    hoursRemaining: Math.round(hoursRemaining),
    transferCount: user.transferCount,
    currentMilestone,
    nextMilestone,
    progressToNext: nextMilestone
      ? Math.round((user.transferCount / nextMilestone.count) * 100)
      : 100,
  });
});

// POST /api/backend/rewards/streak - Update streak after activity
export const POST = handler(async (req: Request) => {
  const { address } = await body(req);

  if (!address) {
    return bad('Wallet address is required', 400);
  }

  const user = await User.findOne({ walletAddress: address });
  if (!user) {
    return bad('User not found', 404);
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let newStreak = user.streak;
  let streakUpdated = false;

  if (user.lastActivityDate) {
    const lastActivityDay = new Date(
      user.lastActivityDate.getFullYear(),
      user.lastActivityDate.getMonth(),
      user.lastActivityDate.getDate()
    );

    const daysDiff = Math.floor((today.getTime() - lastActivityDay.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day, no streak change
      streakUpdated = false;
    } else if (daysDiff === 1) {
      // Consecutive day, increment streak
      newStreak = user.streak + 1;
      streakUpdated = true;
    } else {
      // Streak broken, reset to 1
      newStreak = 1;
      streakUpdated = true;
    }
  } else {
    // First activity ever
    newStreak = 1;
    streakUpdated = true;
  }

  if (streakUpdated) {
    user.streak = newStreak;
    user.lastActivityDate = now;
    await user.save();
  }

  return ok({
    streak: newStreak,
    streakUpdated,
    lastActivityDate: now,
  });
});
