export const runtime = 'nodejs';
import { handler, ok, bad, body } from '@/app/lib/server/route-utils';
import { User } from '@/app/lib/server/models';

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

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ address: string }> }) => {
  const { address } = await params;

  const user = await User.findOne({ walletAddress: address });

  if (!user) {
    return bad('User not found', 404);
  }

  return ok(formatUserResponse(user));
});

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ address: string }> }) => {
  const { address } = await params;
  const { displayName, avatarUrl, email, phone, businessInfo } = await body<any>(req);

  const user = await User.findOne({ walletAddress: address });
  if (!user) {
    return bad('User not found', 404);
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

  return ok({
    message: 'User updated successfully',
    user: formatUserResponse(user),
  });
});
