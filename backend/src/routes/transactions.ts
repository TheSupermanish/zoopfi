import { Router, Request, Response } from 'express';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';

const router = Router();

// GET /api/transactions - Get transactions for a wallet address
router.get('/', async (req: Request, res: Response) => {
  try {
    const { address, limit = 20, offset = 0 } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
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

    res.json({
      transactions,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/transactions - Record a new transaction
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      senderAddress,
      senderUsername,
      receiverAddress,
      receiverUsername,
      amount,
      txHash,
      type = 'send',
      note,
    } = req.body;

    if (!senderAddress || !receiverAddress || !amount || !txHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if transaction already recorded
    const existingTx = await Transaction.findOne({ txHash });
    if (existingTx) {
      return res.status(409).json({ error: 'Transaction already recorded', transaction: existingTx });
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

    res.status(201).json({
      message: 'Transaction recorded',
      transaction,
    });
  } catch (error) {
    console.error('Record transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

