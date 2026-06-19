export const runtime = 'nodejs';
import { handler, ok, bad } from '@/app/lib/server/route-utils';
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

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ username: string }> }) => {
  const { username } = await params;

  const user = await User.findOne({ username: username.toLowerCase() });

  if (!user) {
    return bad('User not found', 404);
  }

  return ok(formatUserResponse(user));
});
