export const runtime = 'nodejs';
import { handler, ok, bad, body, q } from '@/app/lib/server/route-utils';
import { Group, GroupExpense } from '@/app/lib/server/models';

// POST /api/groups/:id/expenses - Add an expense
export const POST = handler(async (req: Request, { params }: { params: Promise<{ groupId: string }> }) => {
  const { groupId: id } = await params;
  const { description, amount, category, paidByAddress, splitType, splitWith, splits: customSplits } = await body<any>(req);

  if (!description || !amount || !paidByAddress) {
    return bad('Description, amount, and payer are required', 400);
  }

  const group = await Group.findById(id);
  if (!group) {
    return bad('Group not found', 404);
  }

  // Find the payer
  const payer = group.members.find(m => m.walletAddress === paidByAddress);
  if (!payer) {
    return bad('Payer is not a member of this group', 400);
  }

  let splits: { username: string; walletAddress: string; amount: number; paid: boolean }[];

  // Check if custom splits were provided
  if (customSplits && Array.isArray(customSplits) && customSplits.length > 0) {
    // Use custom splits from frontend
    splits = customSplits.map((s: any) => ({
      username: s.username,
      walletAddress: s.walletAddress,
      amount: Number(s.amount),
      paid: s.walletAddress === paidByAddress,
    }));

    // Validate that splits add up to total (within tolerance)
    const splitsTotal = splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitsTotal - amount) > 0.01) {
      return bad(
        `Split amounts (${splitsTotal.toFixed(4)}) don't match total (${amount.toFixed(4)})`,
        400
      );
    }
  } else {
    // Calculate equal splits (default behavior)
    let splitMembers = group.members;
    if (splitWith && Array.isArray(splitWith) && splitWith.length > 0) {
      splitMembers = group.members.filter(m =>
        splitWith.includes(m.walletAddress) || m.walletAddress === paidByAddress
      );
    }

    const splitAmount = amount / splitMembers.length;
    splits = splitMembers.map(m => ({
      username: m.username,
      walletAddress: m.walletAddress,
      amount: splitAmount,
      paid: m.walletAddress === paidByAddress,
    }));
  }

  // Create the expense
  const expense = await GroupExpense.create({
    groupId: id,
    description,
    amount,
    category: category || 'other',
    paidByAddress,
    paidByUsername: payer.username,
    splitType: customSplits ? 'custom' : (splitType || 'equal'),
    splits,
  });

  // Update member balances
  // The payer is owed money by others (positive balance)
  // Others owe the payer (negative balance)
  for (const member of group.members) {
    const split = splits.find(s => s.walletAddress === member.walletAddress);
    if (split) {
      if (member.walletAddress === paidByAddress) {
        // Payer paid the full amount, but only owes their share
        member.balance += (amount - split.amount);
      } else {
        // Others owe their share
        member.balance -= split.amount;
      }
    }
  }

  // Update total spent
  group.totalSpent += amount;
  group.isSettled = group.members.every(m => Math.abs(m.balance) < 0.0001);

  await group.save();

  return ok({ expense, group }, 201);
});

// GET /api/groups/:id/expenses - Get expenses for a group
export const GET = handler(async (req: Request, { params }: { params: Promise<{ groupId: string }> }) => {
  const { groupId: id } = await params;
  const limit = q(req, 'limit') ?? 50;
  const offset = q(req, 'offset') ?? 0;

  const expenses = await GroupExpense.find({ groupId: id })
    .sort({ createdAt: -1 })
    .skip(Number(offset))
    .limit(Number(limit));

  const total = await GroupExpense.countDocuments({ groupId: id });

  return ok({ expenses, total });
});
