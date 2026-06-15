import { Router, Request, Response } from 'express';
import { User, IBusinessInfo } from '../models/User';

const router = Router();

// Valid business categories
const BUSINESS_CATEGORIES = ['retail', 'food', 'services', 'technology', 'healthcare', 'entertainment', 'other'];

// POST /api/auth/register - Register a new user with username
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { 
      username, 
      walletAddress, 
      accountType = 'personal',
      displayName,
      avatarUrl,
      email,
      phone,
      businessInfo 
    } = req.body;

    // Basic validation
    if (!username || !walletAddress || !displayName) {
      return res.status(400).json({ error: 'Username, wallet address, and display name are required' });
    }

    // Validate account type
    if (!['personal', 'business'].includes(accountType)) {
      return res.status(400).json({ error: 'Account type must be "personal" or "business"' });
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only' 
      });
    }

    // Validate business info if business account
    if (accountType === 'business') {
      if (!businessInfo) {
        return res.status(400).json({ error: 'Business info is required for business accounts' });
      }
      if (!businessInfo.ownerFirstName || !businessInfo.ownerLastName) {
        return res.status(400).json({ error: 'Owner first name and last name are required for business accounts' });
      }
      if (!businessInfo.category || !BUSINESS_CATEGORIES.includes(businessInfo.category)) {
        return res.status(400).json({ 
          error: `Business category is required and must be one of: ${BUSINESS_CATEGORIES.join(', ')}` 
        });
      }
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
    const userData: any = {
      username: username.toLowerCase(),
      walletAddress,
      accountType,
      displayName: displayName.trim(),
    };

    // Add optional fields
    if (avatarUrl) userData.avatarUrl = avatarUrl;
    if (email) userData.email = email;
    if (phone) userData.phone = phone;

    // Add business info if business account
    if (accountType === 'business' && businessInfo) {
      userData.businessInfo = {
        ownerFirstName: businessInfo.ownerFirstName.trim(),
        ownerLastName: businessInfo.ownerLastName.trim(),
        category: businessInfo.category,
        description: businessInfo.description?.trim(),
        address: businessInfo.address?.trim(),
        website: businessInfo.website?.trim(),
      };
    }

    const user = new User(userData);
    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        username: user.username,
        walletAddress: user.walletAddress,
        accountType: user.accountType,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        email: user.email,
        phone: user.phone,
        businessInfo: user.businessInfo,
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

