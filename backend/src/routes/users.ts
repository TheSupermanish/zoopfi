import { Router, Request, Response } from 'express';
import { User } from '../models/User';

const router = Router();

// Valid business categories
const BUSINESS_CATEGORIES = ['retail', 'food', 'services', 'technology', 'healthcare', 'entertainment', 'other'];

// Helper to format user response
const formatUserResponse = (user: any) => ({
  username: user.username,
  walletAddress: user.walletAddress,
  accountType: user.accountType || 'personal',
  displayName: user.displayName || user.username,
  avatarUrl: user.avatarUrl,
  email: user.email,
  phone: user.phone,
  createdAt: user.createdAt,
  totalSent: user.totalSent,
  totalReceived: user.totalReceived,
  streak: user.streak,
  transferCount: user.transferCount,
  lastActivityDate: user.lastActivityDate,
  businessInfo: user.businessInfo,
});

// GET /api/users/:username - Get user by username
router.get('/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username: username.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(formatUserResponse(user));
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

    res.json(formatUserResponse(user));
  } catch (error) {
    console.error('Get user by address error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/address/:address/convert-to-business - Convert personal account to business
router.post('/address/:address/convert-to-business', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { businessInfo, displayName } = req.body;

    // Find user
    const user = await User.findOne({ walletAddress: address });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a business
    if (user.accountType === 'business') {
      return res.status(400).json({ error: 'Account is already a business account' });
    }

    // Validate business info
    if (!businessInfo) {
      return res.status(400).json({ error: 'Business info is required' });
    }
    if (!businessInfo.ownerFirstName || !businessInfo.ownerLastName) {
      return res.status(400).json({ error: 'Owner first name and last name are required' });
    }
    if (!businessInfo.category || !BUSINESS_CATEGORIES.includes(businessInfo.category)) {
      return res.status(400).json({ 
        error: `Business category is required and must be one of: ${BUSINESS_CATEGORIES.join(', ')}` 
      });
    }

    // Update user to business
    user.accountType = 'business';
    user.businessInfo = {
      ownerFirstName: businessInfo.ownerFirstName.trim(),
      ownerLastName: businessInfo.ownerLastName.trim(),
      category: businessInfo.category,
      description: businessInfo.description?.trim(),
      address: businessInfo.address?.trim(),
      website: businessInfo.website?.trim(),
    };

    // Update display name if provided (should be business name)
    if (displayName) {
      user.displayName = displayName.trim();
    }

    await user.save();

    res.json({
      message: 'Account successfully converted to business',
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('Convert to business error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/users/address/:address - Update user profile
router.patch('/address/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { displayName, avatarUrl, email, phone, businessInfo } = req.body;

    const user = await User.findOne({ walletAddress: address });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update allowed fields
    if (displayName !== undefined) user.displayName = displayName.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;

    // Update business info if business account
    if (user.accountType === 'business' && businessInfo) {
      user.businessInfo = {
        ...user.businessInfo,
        ...businessInfo,
        ownerFirstName: businessInfo.ownerFirstName?.trim() || user.businessInfo?.ownerFirstName,
        ownerLastName: businessInfo.ownerLastName?.trim() || user.businessInfo?.ownerLastName,
        category: businessInfo.category || user.businessInfo?.category,
        description: businessInfo.description?.trim(),
        address: businessInfo.address?.trim(),
        website: businessInfo.website?.trim(),
      };
    }

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

