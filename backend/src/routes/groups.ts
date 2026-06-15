import { Router, Request, Response } from 'express';
import Group from '../models/Group';
import GroupExpense from '../models/GroupExpense';
import GroupInvitation from '../models/GroupInvitation';
import { User } from '../models/User';

const router = Router();

// GET /api/groups - Get all groups for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const groups = await Group.find({
      'members.walletAddress': address,
    }).sort({ updatedAt: -1 });

    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/groups/:id - Get a specific group with expenses
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const expenses = await GroupExpense.find({ groupId: id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ group, expenses });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups - Create a new group
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, icon, color, creatorAddress, memberUsernames } = req.body;

    if (!name || !creatorAddress) {
      return res.status(400).json({ error: 'Name and creator address are required' });
    }

    // Get creator info
    const creator = await User.findOne({ walletAddress: creatorAddress });
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Initialize members with creator
    const members = [{
      username: creator.username,
      walletAddress: creatorAddress,
      balance: 0,
      joinedAt: new Date(),
    }];

    // Add other members if provided
    if (memberUsernames && Array.isArray(memberUsernames)) {
      for (const username of memberUsernames) {
        const user = await User.findOne({ username: username.toLowerCase() });
        if (user && user.walletAddress !== creatorAddress) {
          members.push({
            username: user.username,
            walletAddress: user.walletAddress,
            balance: 0,
            joinedAt: new Date(),
          });
        }
      }
    }

    const group = await Group.create({
      name,
      description,
      icon: icon || '👥',
      color: color || '#7f13ec',
      creatorAddress,
      creatorUsername: creator.username,
      members,
    });

    res.status(201).json({ group });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/groups/:id - Update a group
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color } = req.body;

    const group = await Group.findByIdAndUpdate(
      id,
      { name, description, icon, color },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({ group });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/:id/members - Invite a member to group (sends invitation)
router.post('/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, inviterAddress } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (!inviterAddress) {
      return res.status(400).json({ error: 'Inviter address is required' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if inviter is a member
    const inviter = group.members.find(m => m.walletAddress === inviterAddress);
    if (!inviter) {
      return res.status(403).json({ error: 'Only group members can invite others' });
    }

    // Check if already a member
    if (group.members.some(m => m.walletAddress === user.walletAddress)) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Check if there's already a pending invitation
    const existingInvite = await GroupInvitation.findOne({
      groupId: id,
      invitedAddress: user.walletAddress,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (existingInvite) {
      return res.status(400).json({ error: 'Invitation already sent to this user' });
    }

    // Create invitation
    const invitation = await GroupInvitation.create({
      groupId: id,
      groupName: group.name,
      groupIcon: group.icon,
      groupColor: group.color,
      invitedUsername: user.username,
      invitedAddress: user.walletAddress,
      inviterUsername: inviter.username,
      inviterAddress,
    });

    res.status(201).json({ invitation, message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/groups/invitations - Get pending invitations for a user
router.get('/invitations/pending', async (req: Request, res: Response) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const invitations = await GroupInvitation.find({
      invitedAddress: address,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    res.json({ invitations });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/invitations/:id/accept - Accept an invitation
router.post('/invitations/:invitationId/accept', async (req: Request, res: Response) => {
  try {
    const { invitationId } = req.params;
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const invitation = await GroupInvitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Verify the user is the invitee
    if (invitation.invitedAddress !== address) {
      return res.status(403).json({ error: 'This invitation is not for you' });
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation is no longer pending' });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Get the group
    const group = await Group.findById(invitation.groupId);
    if (!group) {
      invitation.status = 'declined';
      await invitation.save();
      return res.status(404).json({ error: 'Group no longer exists' });
    }

    // Check if already a member (edge case)
    if (group.members.some(m => m.walletAddress === address)) {
      invitation.status = 'accepted';
      await invitation.save();
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    // Add user to group
    group.members.push({
      username: invitation.invitedUsername,
      walletAddress: invitation.invitedAddress,
      balance: 0,
      joinedAt: new Date(),
    });

    await group.save();

    // Update invitation status
    invitation.status = 'accepted';
    await invitation.save();

    res.json({ group, message: 'You have joined the group!' });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/invitations/:id/decline - Decline an invitation
router.post('/invitations/:invitationId/decline', async (req: Request, res: Response) => {
  try {
    const { invitationId } = req.params;
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const invitation = await GroupInvitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Verify the user is the invitee
    if (invitation.invitedAddress !== address) {
      return res.status(403).json({ error: 'This invitation is not for you' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Invitation is no longer pending' });
    }

    // Update invitation status
    invitation.status = 'declined';
    await invitation.save();

    res.json({ message: 'Invitation declined' });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/groups/:id/members/:address - Remove a member
router.delete('/:id/members/:address', async (req: Request, res: Response) => {
  try {
    const { id, address } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const memberIndex = group.members.findIndex(m => m.walletAddress === address);
    if (memberIndex === -1) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Can't remove if balance is not zero
    if (group.members[memberIndex].balance !== 0) {
      return res.status(400).json({ error: 'Member must settle up before leaving' });
    }

    group.members.splice(memberIndex, 1);
    await group.save();

    res.json({ group });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/:id/expenses - Add an expense
router.post('/:id/expenses', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, amount, category, paidByAddress, splitType, splitWith, splits: customSplits } = req.body;

    if (!description || !amount || !paidByAddress) {
      return res.status(400).json({ error: 'Description, amount, and payer are required' });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Find the payer
    const payer = group.members.find(m => m.walletAddress === paidByAddress);
    if (!payer) {
      return res.status(400).json({ error: 'Payer is not a member of this group' });
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
        return res.status(400).json({ 
          error: `Split amounts (${splitsTotal.toFixed(4)}) don't match total (${amount.toFixed(4)})` 
        });
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

    res.status(201).json({ expense, group });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/groups/:id/expenses - Get expenses for a group
router.get('/:id/expenses', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const expenses = await GroupExpense.find({ groupId: id })
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await GroupExpense.countDocuments({ groupId: id });

    res.json({ expenses, total });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/:id/settle - Record a settlement payment
router.post('/:id/settle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fromAddress, toAddress, amount, txHash } = req.body;

    if (!fromAddress || !toAddress || !amount) {
      return res.status(400).json({ error: 'From, to, and amount are required' });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const fromMember = group.members.find(m => m.walletAddress === fromAddress);
    const toMember = group.members.find(m => m.walletAddress === toAddress);

    if (!fromMember || !toMember) {
      return res.status(400).json({ error: 'Both parties must be members' });
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

    res.json({ settlement, group });
  } catch (error) {
    console.error('Settle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/groups/:id - Delete a group
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { address } = req.query;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Only creator can delete
    if (group.creatorAddress !== address) {
      return res.status(403).json({ error: 'Only the creator can delete this group' });
    }

    // Delete all expenses
    await GroupExpense.deleteMany({ groupId: id });
    await Group.findByIdAndDelete(id);

    res.json({ message: 'Group deleted' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

