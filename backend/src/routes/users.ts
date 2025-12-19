import { Router, Request, Response } from 'express';
import { User } from '../models/User';

const router = Router();

// GET /api/users/:username - Get user by username
router.get('/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username: username.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      username: user.username,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      totalSent: user.totalSent,
      totalReceived: user.totalReceived,
      streak: user.streak,
      transferCount: user.transferCount,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/address/:address - Get user by wallet address
router.get('/address/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const user = await User.findOne({ walletAddress: address });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      username: user.username,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      totalSent: user.totalSent,
      totalReceived: user.totalReceived,
      streak: user.streak,
      transferCount: user.transferCount,
      lastActivityDate: user.lastActivityDate,
    });
  } catch (error) {
    console.error('Get user by address error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

