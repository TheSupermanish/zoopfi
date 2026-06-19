export const runtime = 'nodejs';
import { handler, ok, bad, body } from '@/app/lib/server/route-utils';
import { User } from '@/app/lib/server/models';

const BUSINESS_CATEGORIES = ['retail', 'food', 'services', 'technology', 'healthcare', 'entertainment', 'other'];

export const POST = handler(async (req: Request) => {
  const {
    username,
    walletAddress,
    accountType = 'personal',
    displayName,
    avatarUrl,
    email,
    phone,
    businessInfo,
  } = await body<any>(req);

  // Basic validation
  if (!username || !walletAddress || !displayName) {
    return bad('Username, wallet address, and display name are required', 400);
  }

  // Validate account type
  if (!['personal', 'business'].includes(accountType)) {
    return bad('Account type must be "personal" or "business"', 400);
  }

  // Validate username format
  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  if (!usernameRegex.test(username.toLowerCase())) {
    return bad('Username must be 3-20 characters, lowercase letters, numbers, and underscores only', 400);
  }

  // Validate business info if business account
  if (accountType === 'business') {
    if (!businessInfo) {
      return bad('Business info is required for business accounts', 400);
    }
    if (!businessInfo.ownerFirstName || !businessInfo.ownerLastName) {
      return bad('Owner first name and last name are required for business accounts', 400);
    }
    if (!businessInfo.category || !BUSINESS_CATEGORIES.includes(businessInfo.category)) {
      return bad(`Business category is required and must be one of: ${BUSINESS_CATEGORIES.join(', ')}`, 400);
    }
  }

  // Check if username already exists
  const existingUsername = await User.findOne({ username: username.toLowerCase() });
  if (existingUsername) {
    return bad('Username already taken', 409);
  }

  // Check if wallet already registered
  const existingWallet = await User.findOne({ walletAddress });
  if (existingWallet) {
    return ok({ error: 'Wallet already registered', user: existingWallet }, 409);
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

  return ok(
    {
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
    },
    201
  );
});
