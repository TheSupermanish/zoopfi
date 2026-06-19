export const runtime = 'nodejs';
import { handler, ok, bad, body } from '@/app/lib/server/route-utils';
import { Group, GroupInvitation } from '@/app/lib/server/models';

// POST /api/groups/invitations/:id/accept - Accept an invitation
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

  // Check if invitation is still valid
  if (invitation.status !== 'pending') {
    return bad('Invitation is no longer pending', 400);
  }

  if (invitation.expiresAt < new Date()) {
    return bad('Invitation has expired', 400);
  }

  // Get the group
  const group = await Group.findById(invitation.groupId);
  if (!group) {
    invitation.status = 'declined';
    await invitation.save();
    return bad('Group no longer exists', 404);
  }

  // Check if already a member (edge case)
  if (group.members.some(m => m.walletAddress === address)) {
    invitation.status = 'accepted';
    await invitation.save();
    return bad('You are already a member of this group', 400);
  }

  // Add user to group
  group.members.push({
    username: invitation.invitedUsername,
    walletAddress: invitation.invitedAddress,
    balance: 0,
    joinedAt: new Date(),
  });

  await group.save();

  // Update invitation status
  invitation.status = 'accepted';
  await invitation.save();

  return ok({ group, message: 'You have joined the group!' });
});
