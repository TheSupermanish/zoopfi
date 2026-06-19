export const runtime = 'nodejs';
import { handler, ok, bad, body } from '@/app/lib/server/route-utils';
import { User } from '@/app/lib/server/models';

const BUSINESS_CATEGORIES = ['retail', 'food', 'services', 'technology', 'healthcare', 'entertainment', 'other'];

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

export const POST = handler(async (req: Request, { params }: { params: Promise<{ address: string }> }) => {
  const { address } = await params;
  const { businessInfo, displayName } = await body<any>(req);

  // Find user
  const user = await User.findOne({ walletAddress: address });
  if (!user) {
    return bad('User not found', 404);
  }

  // Check if already a business
  if (user.accountType === 'business') {
    return bad('Account is already a business account', 400);
  }

  // Validate business info
  if (!businessInfo) {
    return bad('Business info is required', 400);
  }
  if (!businessInfo.ownerFirstName || !businessInfo.ownerLastName) {
    return bad('Owner first name and last name are required', 400);
  }
  if (!businessInfo.category || !BUSINESS_CATEGORIES.includes(businessInfo.category)) {
    return bad(`Business category is required and must be one of: ${BUSINESS_CATEGORIES.join(', ')}`, 400);
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

  return ok({
    message: 'Account successfully converted to business',
    user: formatUserResponse(user),
  });
});
