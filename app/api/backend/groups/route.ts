export const runtime = 'nodejs';
import { handler, ok, bad, body, q } from '@/app/lib/server/route-utils';
import { Group, User } from '@/app/lib/server/models';

// GET /api/groups - Get all groups for a user
export const GET = handler(async (req: Request) => {
  const address = q(req, 'address');

  if (!address) {
    return bad('Wallet address is required', 400);
  }

  const groups = await Group.find({
    'members.walletAddress': address,
  }).sort({ updatedAt: -1 });

  return ok({ groups });
});

// POST /api/groups - Create a new group
export const POST = handler(async (req: Request) => {
  const { name, description, icon, color, creatorAddress, memberUsernames } = await body<any>(req);

  if (!name || !creatorAddress) {
    return bad('Name and creator address are required', 400);
  }

  // Get creator info
  const creator = await User.findOne({ walletAddress: creatorAddress });
  if (!creator) {
    return bad('Creator not found', 404);
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

  return ok({ group }, 201);
});
