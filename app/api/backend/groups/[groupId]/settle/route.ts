export const runtime = 'nodejs';
import { handler, ok, bad, body } from '@/app/lib/server/route-utils';
import { Group, GroupExpense } from '@/app/lib/server/models';

// POST /api/groups/:id/settle - Record a settlement payment
export const POST = handler(async (req: Request, { params }: { params: Promise<{ groupId: string }> }) => {
  const { groupId: id } = await params;
  const { fromAddress, toAddress, amount, txHash } = await body<any>(req);

  if (!fromAddress || !toAddress || !amount) {
    return bad('From, to, and amount are required', 400);
  }

  const group = await Group.findById(id);
  if (!group) {
    return bad('Group not found', 404);
  }

  const fromMember = group.members.find(m => m.walletAddress === fromAddress);
  const toMember = group.members.find(m => m.walletAddress === toAddress);

  if (!fromMember || !toMember) {
    return bad('Both parties must be members', 400);
  }

  // Update balances
  fromMember.balance += amount; // Paying off debt increases balance
  toMember.balance -= amount; // Receiving payment decreases balance (they're owed less)

  // Check if group is now settled
  group.isSettled = group.members.every(m => Math.abs(m.balance) < 0.0001);

  await group.save();

  // Create a settlement expense record
  const settlement = await GroupExpense.create({
    groupId: id,
    description: `Settlement: ${fromMember.username} → ${toMember.username}`,
    amount,
    category: 'other',
    paidByAddress: fromAddress,
    paidByUsername: fromMember.username,
    splitType: 'exact',
    splits: [{
      username: toMember.username,
      walletAddress: toAddress,
      amount,
      paid: true,
    }],
    txHash,
  });

  return ok({ settlement, group });
});
