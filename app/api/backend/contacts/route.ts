export const runtime = 'nodejs';
import { handler, ok, bad, body, q } from '@/app/lib/server/route-utils';
import { Contact, User } from '@/app/lib/server/models';

// GET /api/contacts - Get contacts for a wallet address
export const GET = handler(async (req: Request) => {
  const address = q(req, 'address');

  if (!address) {
    return bad('Wallet address is required', 400);
  }

  const contacts = await Contact.find({ userAddress: address }).sort({ createdAt: -1 });

  return ok({ contacts });
});

// POST /api/contacts - Add a new contact
export const POST = handler(async (req: Request) => {
  const { userAddress, contactUsername, nickname } = await body<any>(req);

  if (!userAddress || !contactUsername) {
    return bad('User address and contact username are required', 400);
  }

  // Get the user making the request
  const user = await User.findOne({ walletAddress: userAddress });
  if (!user) {
    return bad('User not found', 404);
  }

  // Get the contact user
  const contactUser = await User.findOne({ username: contactUsername.toLowerCase() });
  if (!contactUser) {
    return bad('Contact user not found', 404);
  }

  // Check if already a contact
  const existingContact = await Contact.findOne({
    userAddress,
    contactUsername: contactUsername.toLowerCase(),
  });

  if (existingContact) {
    return bad('Contact already exists', 409);
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

  return ok(
    {
      message: 'Contact added',
      contact,
    },
    201
  );
});
