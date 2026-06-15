import { Router, Request, Response } from 'express';
import { PaymentRequest } from '../models/PaymentRequest';
import { User } from '../models/User';

const router = Router();

// GET /api/requests - Get payment requests for a wallet
router.get('/', async (req: Request, res: Response) => {
  try {
    const { address, type = 'all' } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
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

    res.json({ requests });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/requests - Create a payment request
router.post('/', async (req: Request, res: Response) => {
  try {
    const { requesterAddress, payerUsername, amount, message, expiresInHours = 24 } = req.body;

    if (!requesterAddress || !amount) {
      return res.status(400).json({ error: 'Requester address and amount are required' });
    }

    // Get requester user
    const requester = await User.findOne({ walletAddress: requesterAddress });
    if (!requester) {
      return res.status(404).json({ error: 'Requester not found' });
    }

    // If payer specified, get their info
    let payerAddress;
    if (payerUsername) {
      const payer = await User.findOne({ username: payerUsername.toLowerCase() });
      if (!payer) {
        return res.status(404).json({ error: 'Payer not found' });
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

    res.status(201).json({
      message: 'Payment request created',
      request,
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/requests/:requestId - Update payment request status
router.put('/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { status, txHash } = req.body;

    if (!['paid', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const update: any = { status };
    if (txHash) {
      update.txHash = txHash;
    }

    const request = await PaymentRequest.findByIdAndUpdate(
      requestId,
      update,
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({
      message: 'Request updated',
      request,
    });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

