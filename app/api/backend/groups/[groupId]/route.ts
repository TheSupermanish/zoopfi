export const runtime = 'nodejs';
import { handler, ok, bad, body, q } from '@/app/lib/server/route-utils';
import { Group, GroupExpense } from '@/app/lib/server/models';

// GET /api/groups/:id - Get a specific group with expenses
export const GET = handler(async (_req: Request, { params }: { params: Promise<{ groupId: string }> }) => {
  const { groupId: id } = await params;

  const group = await Group.findById(id);
  if (!group) {
    return bad('Group not found', 404);
  }

  const expenses = await GroupExpense.find({ groupId: id })
    .sort({ createdAt: -1 })
    .limit(50);

  return ok({ group, expenses });
});

// PUT /api/groups/:id - Update a group
export const PUT = handler(async (req: Request, { params }: { params: Promise<{ groupId: string }> }) => {
  const { groupId: id } = await params;
  const { name, description, icon, color } = await body<any>(req);

  const group = await Group.findByIdAndUpdate(
    id,
    { name, description, icon, color },
    { new: true }
  );

  if (!group) {
    return bad('Group not found', 404);
  }

  return ok({ group });
});

// DELETE /api/groups/:id - Delete a group
export const DELETE = handler(async (req: Request, { params }: { params: Promise<{ groupId: string }> }) => {
  const { groupId: id } = await params;
  const address = q(req, 'address');

  const group = await Group.findById(id);
  if (!group) {
    return bad('Group not found', 404);
  }

  // Only creator can delete
  if (group.creatorAddress !== address) {
    return bad('Only the creator can delete this group', 403);
  }

  // Delete all expenses
  await GroupExpense.deleteMany({ groupId: id });
  await Group.findByIdAndDelete(id);

  return ok({ message: 'Group deleted' });
});
