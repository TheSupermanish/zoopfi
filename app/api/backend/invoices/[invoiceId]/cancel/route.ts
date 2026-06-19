export const runtime = 'nodejs';
import { handler, ok, bad, body } from '@/app/lib/server/route-utils';
import { Invoice } from '@/app/lib/server/models';

// POST /api/invoices/:invoiceId/cancel - Cancel an invoice
const cancelInvoice = handler(
  async (req: Request, { params }: { params: Promise<{ invoiceId: string }> }) => {
    const { invoiceId } = await params;
    const { businessAddress } = await body<{ businessAddress?: string }>(req);

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return bad('Invoice not found', 404);
    }

    if (invoice.businessAddress !== businessAddress) {
      return bad('Not authorized', 403);
    }

    if (invoice.status === 'paid') {
      return bad('Cannot cancel paid invoice', 400);
    }

    invoice.status = 'cancelled';
    await invoice.save();

    return ok({ invoice, message: 'Invoice cancelled' });
  }
);

export const POST = cancelInvoice;
export const PUT = cancelInvoice;
