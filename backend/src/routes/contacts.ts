import { Router, Request, Response } from 'express';
import { Contact } from '../models/Contact';
import { User } from '../models/User';

const router = Router();

// GET /api/contacts - Get contacts for a wallet address
router.get('/', async (req: Request, res: Response) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const contacts = await Contact.find({ userAddress: address })
      .sort({ createdAt: -1 });

    res.json({ contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/contacts - Add a new contact
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userAddress, contactUsername, nickname } = req.body;

    if (!userAddress || !contactUsername) {
      return res.status(400).json({ error: 'User address and contact username are required' });
    }

    // Get the user making the request
    const user = await User.findOne({ walletAddress: userAddress });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the contact user
    const contactUser = await User.findOne({ username: contactUsername.toLowerCase() });
    if (!contactUser) {
      return res.status(404).json({ error: 'Contact user not found' });
    }

    // Check if already a contact
    const existingContact = await Contact.findOne({
      userAddress,
      contactUsername: contactUsername.toLowerCase(),
    });

    if (existingContact) {
      return res.status(409).json({ error: 'Contact already exists' });
    }

    // Create contact
    const contact = new Contact({
      userId: user._id,
      userAddress,
      contactUsername: contactUser.username,
      contactAddress: contactUser.walletAddress,
      nickname,
    });

    await contact.save();

    res.status(201).json({
      message: 'Contact added',
      contact,
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/contacts/:contactId - Remove a contact
router.delete('/:contactId', async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { userAddress } = req.query;

    if (!userAddress) {
      return res.status(400).json({ error: 'User address is required' });
    }

    const contact = await Contact.findOneAndDelete({
      _id: contactId,
      userAddress,
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact removed' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

