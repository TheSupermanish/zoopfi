export const runtime = 'nodejs';
import { handler, ok, bad, body } from '@/app/lib/server/route-utils';
import { Invoice } from '@/app/lib/server/models';

// POST /api/invoices/:invoiceId/pay - Mark invoice as paid
const payInvoice = handler(
  async (req: Request, { params }: { params: Promise<{ invoiceId: string }> }) => {
    const { invoiceId } = await params;
    const { txHash, amount, customerAddress } = await body<{
      txHash?: string;
      amount?: number;
      customerAddress?: string;
    }>(req);

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return bad('Invoice not found', 404);
    }

    // Verify customer authorization
    if (invoice.customerAddress !== customerAddress) {
      return bad('Not authorized to pay this invoice', 403);
    }

    if (invoice.status === 'paid') {
      return bad('Invoice already paid', 400);
    }

    if (invoice.status === 'cancelled') {
      return bad('Cannot pay cancelled invoice', 400);
    }

    invoice.status = 'paid';
    invoice.paidDate = new Date();
    invoice.txHash = txHash;
    invoice.paidAmount = amount || invoice.total;

    await invoice.save();

    return ok({ invoice, message: 'Invoice marked as paid' });
  }
);

export const POST = payInvoice;
export const PUT = payInvoice;
