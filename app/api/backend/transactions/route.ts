export const runtime = 'nodejs';
import { handler, ok, bad, body, q } from '@/app/lib/server/route-utils';
import { Transaction, User } from '@/app/lib/server/models';

// GET /api/backend/transactions - Get transactions for a wallet address
export const GET = handler(async (req: Request) => {
  const address = q(req, 'address');
  const limit = q(req, 'limit') ?? 20;
  const offset = q(req, 'offset') ?? 0;

  if (!address) {
    return bad('Wallet address is required', 400);
  }

  const transactions = await Transaction.find({
    $or: [
      { senderAddress: address },
      { receiverAddress: address },
    ],
  })
    .sort({ timestamp: -1 })
    .skip(Number(offset))
    .limit(Number(limit));

  const total = await Transaction.countDocuments({
    $or: [
      { senderAddress: address },
      { receiverAddress: address },
    ],
  });

  return ok({
    transactions,
    total,
    limit: Number(limit),
    offset: Number(offset),
  });
});

// POST /api/backend/transactions - Record a new transaction
export const POST = handler(async (req: Request) => {
  const {
    senderAddress,
    senderUsername,
    receiverAddress,
    receiverUsername,
    amount,
    txHash,
    type = 'send',
    note,
  } = await body(req);

  if (!senderAddress || !receiverAddress || !amount || !txHash) {
    return bad('Missing required fields', 400);
  }

  // Check if transaction already recorded
  const existingTx = await Transaction.findOne({ txHash });
  if (existingTx) {
    return ok({ error: 'Transaction already recorded', transaction: existingTx }, 409);
  }

  // Create transaction record
  const transaction = new Transaction({
    senderAddress,
    senderUsername: senderUsername || 'unknown',
    receiverAddress,
    receiverUsername: receiverUsername || 'unknown',
    amount,
    txHash,
    type,
    status: 'confirmed',
    note,
  });

  await transaction.save();

  // Update sender stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await User.findOneAndUpdate(
    { walletAddress: senderAddress },
    {
      $inc: { totalSent: amount, transferCount: 1 },
      $set: { lastActivityDate: new Date() },
    }
  );

  // Update receiver stats
  await User.findOneAndUpdate(
    { walletAddress: receiverAddress },
    {
      $inc: { totalReceived: amount },
    }
  );

  return ok({
    message: 'Transaction recorded',
    transaction,
  }, 201);
});
