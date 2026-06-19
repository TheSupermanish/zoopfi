export const runtime = 'nodejs';
import { handler, ok, bad, q } from '@/app/lib/server/route-utils';
import { GroupInvitation } from '@/app/lib/server/models';

// GET /api/groups/invitations/pending - Get pending invitations for a user
export const GET = handler(async (req: Request) => {
  const address = q(req, 'address');

  if (!address) {
    return bad('Wallet address is required', 400);
  }

  const invitations = await GroupInvitation.find({
    invitedAddress: address,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  return ok({ invitations });
});
