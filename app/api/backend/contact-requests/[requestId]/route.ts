export const runtime = 'nodejs';
import { handler, ok, bad, body, q } from '@/app/lib/server/route-utils';
import { ContactRequest, User, Contact } from '@/app/lib/server/models';

// PATCH /api/contact-requests/:id - Accept or decline a request
export const PATCH = handler(
  async (req: Request, { params }: { params: Promise<{ requestId: string }> }) => {
    const { requestId: id } = await params;
    const { action, address } = await body<any>(req); // action: 'accept' | 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return bad('Valid action (accept/decline) is required', 400);
    }

    if (!address) {
      return bad('Wallet address is required', 400);
    }

    const request = await ContactRequest.findById(id);

    if (!request) {
      return bad('Contact request not found', 404);
    }

    // Only receiver can accept/decline
    if (request.receiverAddress !== address) {
      return bad('Only the receiver can respond to this request', 403);
    }

    if (request.status !== 'pending') {
      return bad('This request has already been processed', 400);
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

      return ok({ message: 'Friend request accepted', request });
    } else {
      request.status = 'declined';
      await request.save();
      return ok({ message: 'Friend request declined', request });
    }
  }
);

// DELETE /api/contact-requests/:id - Cancel a sent request
export const DELETE = handler(
  async (req: Request, { params }: { params: Promise<{ requestId: string }> }) => {
    const { requestId: id } = await params;
    const address = q(req, 'address');

    if (!address) {
      return bad('Wallet address is required', 400);
    }

    const request = await ContactRequest.findById(id);

    if (!request) {
      return bad('Contact request not found', 404);
    }

    // Only sender can cancel
    if (request.senderAddress !== address) {
      return bad('Only the sender can cancel this request', 403);
    }

    if (request.status !== 'pending') {
      return bad('Can only cancel pending requests', 400);
    }

    await ContactRequest.findByIdAndDelete(id);

    return ok({ message: 'Friend request cancelled' });
  }
);
