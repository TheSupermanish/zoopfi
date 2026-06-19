export const runtime = 'nodejs';
import { handler, ok, bad, body } from '@/app/lib/server/route-utils';
import { GroupInvitation } from '@/app/lib/server/models';

// POST /api/groups/invitations/:id/decline - Decline an invitation
export const POST = handler(async (req: Request, { params }: { params: Promise<{ invitationId: string }> }) => {
  const { invitationId } = await params;
  const { address } = await body<any>(req);

  if (!address) {
    return bad('Wallet address is required', 400);
  }

  const invitation = await GroupInvitation.findById(invitationId);
  if (!invitation) {
    return bad('Invitation not found', 404);
  }

  // Verify the user is the invitee
  if (invitation.invitedAddress !== address) {
    return bad('This invitation is not for you', 403);
  }

  if (invitation.status !== 'pending') {
    return bad('Invitation is no longer pending', 400);
  }

  // Update invitation status
  invitation.status = 'declined';
  await invitation.save();

  return ok({ message: 'Invitation declined' });
});
