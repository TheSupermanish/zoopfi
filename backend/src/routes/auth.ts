import { Router, Request, Response } from 'express';
import { User } from '../models/User';

const router = Router();

// POST /api/auth/register - Register a new user with username
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, walletAddress } = req.body;

    if (!username || !walletAddress) {
      return res.status(400).json({ error: 'Username and wallet address are required' });
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only' 
      });
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Check if wallet already registered
    const existingWallet = await User.findOne({ walletAddress });
    if (existingWallet) {
      return res.status(409).json({ error: 'Wallet already registered', user: existingWallet });
    }

    // Create new user
    const user = new User({
      username: username.toLowerCase(),
      walletAddress,
    });

    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        username: user.username,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/check-username/:username - Check if username is available
router.get('/check-username/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      return res.status(400).json({ 
        available: false, 
        error: 'Invalid username format' 
      });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    
    res.json({ 
      available: !existingUser,
      username: username.toLowerCase(),
    });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

