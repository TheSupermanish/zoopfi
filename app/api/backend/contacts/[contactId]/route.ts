export const runtime = 'nodejs';
import { handler, ok, bad, q } from '@/app/lib/server/route-utils';
import { Contact } from '@/app/lib/server/models';

// DELETE /api/contacts/:contactId - Remove a contact
export const DELETE = handler(
  async (req: Request, { params }: { params: Promise<{ contactId: string }> }) => {
    const { contactId } = await params;
    const userAddress = q(req, 'userAddress');

    if (!userAddress) {
      return bad('User address is required', 400);
    }

    const contact = await Contact.findOneAndDelete({
      _id: contactId,
      userAddress,
    });

    if (!contact) {
      return bad('Contact not found', 404);
    }

    return ok({ message: 'Contact removed' });
  }
);
