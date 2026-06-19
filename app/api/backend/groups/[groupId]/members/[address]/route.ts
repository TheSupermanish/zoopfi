export const runtime = 'nodejs';
import { handler, ok, bad } from '@/app/lib/server/route-utils';
import { Group } from '@/app/lib/server/models';

// DELETE /api/groups/:id/members/:address - Remove a member
export const DELETE = handler(async (_req: Request, { params }: { params: Promise<{ groupId: string; address: string }> }) => {
  const { groupId: id, address } = await params;

  const group = await Group.findById(id);
  if (!group) {
    return bad('Group not found', 404);
  }

  const memberIndex = group.members.findIndex(m => m.walletAddress === address);
  if (memberIndex === -1) {
    return bad('Member not found', 404);
  }

  // Can't remove if balance is not zero
  if (group.members[memberIndex].balance !== 0) {
    return bad('Member must settle up before leaving', 400);
  }

  group.members.splice(memberIndex, 1);
  await group.save();

  return ok({ group });
});
