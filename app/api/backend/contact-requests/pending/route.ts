export const runtime = 'nodejs';
import { handler, ok, bad, q } from '@/app/lib/server/route-utils';
import { ContactRequest } from '@/app/lib/server/models';

// GET /api/contact-requests/pending - Get pending requests count
export const GET = handler(async (req: Request) => {
  const address = q(req, 'address');

  if (!address) {
    return bad('Wallet address is required', 400);
  }

  const count = await ContactRequest.countDocuments({
    receiverAddress: address,
    status: 'pending',
  });

  return ok({ count });
});
