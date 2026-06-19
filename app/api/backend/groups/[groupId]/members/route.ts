export const runtime = 'nodejs';
import { handler, ok, bad, body } from '@/app/lib/server/route-utils';
import { Group, GroupInvitation, User } from '@/app/lib/server/models';

// POST /api/groups/:id/members - Invite a member to group (sends invitation)
export const POST = handler(async (req: Request, { params }: { params: Promise<{ groupId: string }> }) => {
  const { groupId: id } = await params;
  const { username, inviterAddress } = await body<any>(req);

  if (!username) {
    return bad('Username is required', 400);
  }

  if (!inviterAddress) {
    return bad('Inviter address is required', 400);
  }

  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user) {
    return bad('User not found', 404);
  }

  const group = await Group.findById(id);
  if (!group) {
    return bad('Group not found', 404);
  }

  // Check if inviter is a member
  const inviter = group.members.find(m => m.walletAddress === inviterAddress);
  if (!inviter) {
    return bad('Only group members can invite others', 403);
  }

  // Check if already a member
  if (group.members.some(m => m.walletAddress === user.walletAddress)) {
    return bad('User is already a member', 400);
  }

  // Check if there's already a pending invitation
  const existingInvite = await GroupInvitation.findOne({
    groupId: id,
    invitedAddress: user.walletAddress,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });

  if (existingInvite) {
    return bad('Invitation already sent to this user', 400);
  }

  // Create invitation
  const invitation = await GroupInvitation.create({
    groupId: id,
    groupName: group.name,
    groupIcon: group.icon,
    groupColor: group.color,
    invitedUsername: user.username,
    invitedAddress: user.walletAddress,
    inviterUsername: inviter.username,
    inviterAddress,
  });

  return ok({ invitation, message: 'Invitation sent successfully' }, 201);
});
