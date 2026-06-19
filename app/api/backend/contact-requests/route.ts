export const runtime = 'nodejs';
import { handler, ok, bad, body, q } from '@/app/lib/server/route-utils';
import { ContactRequest, User, Contact } from '@/app/lib/server/models';

// POST /api/contact-requests - Send a contact request
export const POST = handler(async (req: Request) => {
  try {
    const { senderAddress, receiverUsername, message } = await body<any>(req);

    if (!senderAddress || !receiverUsername) {
      return bad('Sender address and receiver username are required', 400);
    }

    // Get sender info
    const sender = await User.findOne({ walletAddress: senderAddress });
    if (!sender) {
      return bad('Sender not found', 404);
    }

    // Get receiver info
    const receiver = await User.findOne({ username: receiverUsername.toLowerCase() });
    if (!receiver) {
      return bad('User not found', 404);
    }

    // Can't send request to yourself
    if (sender.walletAddress === receiver.walletAddress) {
      return bad("You can't send a friend request to yourself", 400);
    }

    // Check if already contacts (either direction)
    const existingContact = await Contact.findOne({
      $or: [
        { userAddress: senderAddress, contactUsername: receiverUsername.toLowerCase() },
        { userAddress: receiver.walletAddress, contactUsername: sender.username },
      ],
    });

    if (existingContact) {
      return bad('You are already friends with this user', 400);
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

        return ok(
          {
            message: 'Friend request accepted! They had already sent you a request.',
            autoAccepted: true,
          },
          200
        );
      }

      return bad('Friend request already pending', 400);
    }

    // Create new request
    const contactRequest = await ContactRequest.create({
      senderAddress,
      senderUsername: sender.username,
      receiverAddress: receiver.walletAddress,
      receiverUsername: receiver.username,
      message: message || undefined,
    });

    return ok({ request: contactRequest }, 201);
  } catch (error: any) {
    console.error('Create contact request error:', error);
    if (error.code === 11000) {
      return bad('Friend request already exists', 400);
    }
    throw error;
  }
});

// GET /api/contact-requests - Get contact requests for a user
export const GET = handler(async (req: Request) => {
  const address = q(req, 'address');
  const type = q(req, 'type') ?? 'received';

  if (!address) {
    return bad('Wallet address is required', 400);
  }

  let query: any = {};

  if (type === 'sent') {
    query.senderAddress = address;
  } else if (type === 'received') {
    query.receiverAddress = address;
  } else {
    query = {
      $or: [{ senderAddress: address }, { receiverAddress: address }],
    };
  }

  const requests = await ContactRequest.find(query).sort({ createdAt: -1 }).limit(50);

  return ok({ requests });
});
