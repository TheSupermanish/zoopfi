import { Router, Request, Response } from 'express';
import ContactRequest from '../models/ContactRequest';
import { User } from '../models/User';
import { Contact } from '../models/Contact';

const router = Router();

// POST /api/contact-requests - Send a contact request
router.post('/', async (req: Request, res: Response) => {
  try {
    const { senderAddress, receiverUsername, message } = req.body;

    if (!senderAddress || !receiverUsername) {
      return res.status(400).json({ error: 'Sender address and receiver username are required' });
    }

    // Get sender info
    const sender = await User.findOne({ walletAddress: senderAddress });
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }

    // Get receiver info
    const receiver = await User.findOne({ username: receiverUsername.toLowerCase() });
    if (!receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Can't send request to yourself
    if (sender.walletAddress === receiver.walletAddress) {
      return res.status(400).json({ error: "You can't send a friend request to yourself" });
    }

    // Check if already contacts (either direction)
    const existingContact = await Contact.findOne({
      $or: [
        { userAddress: senderAddress, contactUsername: receiverUsername.toLowerCase() },
        { userAddress: receiver.walletAddress, contactUsername: sender.username },
      ],
    });

    if (existingContact) {
      return res.status(400).json({ error: 'You are already friends with this user' });
    }

    // Check if request already exists
    const existingRequest = await ContactRequest.findOne({
      $or: [
        { senderAddress, receiverAddress: receiver.walletAddress, status: 'pending' },
        { senderAddress: receiver.walletAddress, receiverAddress: senderAddress, status: 'pending' },
      ],
    });

    if (existingRequest) {
      // If they already sent us a request, auto-accept it
      if (existingRequest.senderAddress === receiver.walletAddress) {
        existingRequest.status = 'accepted';
        await existingRequest.save();

        // Create mutual contacts
        await Contact.create([
          {
            userAddress: senderAddress,
            contactUsername: receiver.username,
            contactAddress: receiver.walletAddress,
          },
          {
            userAddress: receiver.walletAddress,
            contactUsername: sender.username,
            contactAddress: senderAddress,
          },
        ]);

        return res.status(200).json({ 
          message: 'Friend request accepted! They had already sent you a request.',
          autoAccepted: true,
        });
      }

      return res.status(400).json({ error: 'Friend request already pending' });
    }

    // Create new request
    const contactRequest = await ContactRequest.create({
      senderAddress,
      senderUsername: sender.username,
      receiverAddress: receiver.walletAddress,
      receiverUsername: receiver.username,
      message: message || undefined,
    });

    res.status(201).json({ request: contactRequest });
  } catch (error: any) {
    console.error('Create contact request error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Friend request already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/contact-requests - Get contact requests for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const { address, type = 'received' } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    let query: any = {};

    if (type === 'sent') {
      query.senderAddress = address;
    } else if (type === 'received') {
      query.receiverAddress = address;
    } else {
      query = {
        $or: [
          { senderAddress: address },
          { receiverAddress: address },
        ],
      };
    }

    const requests = await ContactRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ requests });
  } catch (error) {
    console.error('Get contact requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/contact-requests/pending - Get pending requests count
router.get('/pending', async (req: Request, res: Response) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const count = await ContactRequest.countDocuments({
      receiverAddress: address,
      status: 'pending',
    });

    res.json({ count });
  } catch (error) {
    console.error('Get pending count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/contact-requests/:id - Accept or decline a request
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, address } = req.body; // action: 'accept' | 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Valid action (accept/decline) is required' });
    }

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const request = await ContactRequest.findById(id);

    if (!request) {
      return res.status(404).json({ error: 'Contact request not found' });
    }

    // Only receiver can accept/decline
    if (request.receiverAddress !== address) {
      return res.status(403).json({ error: 'Only the receiver can respond to this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been processed' });
    }

    if (action === 'accept') {
      request.status = 'accepted';
      await request.save();

      // Create mutual contacts
      const sender = await User.findOne({ walletAddress: request.senderAddress });
      const receiver = await User.findOne({ walletAddress: request.receiverAddress });

      if (sender && receiver) {
        await Contact.create([
          {
            userAddress: request.senderAddress,
            contactUsername: receiver.username,
            contactAddress: receiver.walletAddress,
          },
          {
            userAddress: request.receiverAddress,
            contactUsername: sender.username,
            contactAddress: sender.walletAddress,
          },
        ]);
      }

      res.json({ message: 'Friend request accepted', request });
    } else {
      request.status = 'declined';
      await request.save();
      res.json({ message: 'Friend request declined', request });
    }
  } catch (error) {
    console.error('Update contact request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/contact-requests/:id - Cancel a sent request
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const request = await ContactRequest.findById(id);

    if (!request) {
      return res.status(404).json({ error: 'Contact request not found' });
    }

    // Only sender can cancel
    if (request.senderAddress !== address) {
      return res.status(403).json({ error: 'Only the sender can cancel this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending requests' });
    }

    await ContactRequest.findByIdAndDelete(id);

    res.json({ message: 'Friend request cancelled' });
  } catch (error) {
    console.error('Delete contact request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

