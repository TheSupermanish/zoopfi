export const runtime = 'nodejs';
import { handler, ok, bad, body, q } from '@/app/lib/server/route-utils';
import { PaymentRequest, User } from '@/app/lib/server/models';

// GET /api/backend/requests - Get payment requests for a wallet
export const GET = handler(async (req: Request) => {
  const address = q(req, 'address');
  const type = q(req, 'type') ?? 'all';

  if (!address) {
    return bad('Wallet address is required', 400);
  }

  // Get user's username for matching
  const user = await User.findOne({ walletAddress: address });

  let query: any = {};

  if (type === 'sent') {
    // Requests I created
    query.requesterAddress = address;
  } else if (type === 'received') {
    // Requests where I'm the payer (either directly or open requests not from me)
    query = {
      $or: [
        { payerAddress: address },
        // Open requests (no specific payer) that I didn't create
        {
          payerAddress: { $exists: false },
          requesterAddress: { $ne: address },
          status: 'pending'
        },
        {
          payerAddress: null,
          requesterAddress: { $ne: address },
          status: 'pending'
        },
      ],
    };
    // Also include if my username matches payerUsername
    if (user) {
      query.$or.push({ payerUsername: user.username });
    }
  } else {
    query = {
      $or: [
        { requesterAddress: address },
        { payerAddress: address },
      ],
    };
  }

  const requests = await PaymentRequest.find(query)
    .sort({ createdAt: -1 });

  return ok({ requests });
});

// POST /api/backend/requests - Create a payment request
export const POST = handler(async (req: Request) => {
  const { requesterAddress, payerUsername, amount, message, expiresInHours = 24 } = await body<{
    requesterAddress?: string;
    payerUsername?: string;
    amount?: number;
    message?: string;
    expiresInHours?: number;
  }>(req);

  if (!requesterAddress || !amount) {
    return bad('Requester address and amount are required', 400);
  }

  // Get requester user
  const requester = await User.findOne({ walletAddress: requesterAddress });
  if (!requester) {
    return bad('Requester not found', 404);
  }

  // If payer specified, get their info
  let payerAddress;
  if (payerUsername) {
    const payer = await User.findOne({ username: payerUsername.toLowerCase() });
    if (!payer) {
      return bad('Payer not found', 404);
    }
    payerAddress = payer.walletAddress;
  }

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const request = new PaymentRequest({
    requesterId: requester._id,
    requesterAddress,
    requesterUsername: requester.username,
    payerUsername: payerUsername?.toLowerCase(),
    payerAddress,
    amount,
    message,
    expiresAt,
  });

  await request.save();

  return ok({
    message: 'Payment request created',
    request,
  }, 201);
});
