import { Router, Request, Response } from 'express';
import { User } from '../models/User';

const router = Router();

// GET /api/rewards/streak - Get streak info for a wallet
router.get('/streak', async (req: Request, res: Response) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const user = await User.findOne({ walletAddress: address });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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

    res.json({
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
  } catch (error) {
    console.error('Get streak error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/rewards/streak - Update streak after activity
router.post('/streak', async (req: Request, res: Response) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const user = await User.findOne({ walletAddress: address });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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

    res.json({
      streak: newStreak,
      streakUpdated,
      lastActivityDate: now,
    });
  } catch (error) {
    console.error('Update streak error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

