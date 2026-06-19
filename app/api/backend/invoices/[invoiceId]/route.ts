export const runtime = 'nodejs';
import { handler, ok, bad, body, q } from '@/app/lib/server/route-utils';
import { Invoice, ILineItem } from '@/app/lib/server/models';

// GET /api/invoices/:invoiceId - Get a specific invoice
export const GET = handler(
  async (_req: Request, { params }: { params: Promise<{ invoiceId: string }> }) => {
    const { invoiceId } = await params;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return bad('Invoice not found', 404);
    }

    return ok({ invoice });
  }
);

// PUT /api/invoices/:invoiceId - Update an invoice (draft only)
export const PUT = handler(
  async (req: Request, { params }: { params: Promise<{ invoiceId: string }> }) => {
    const { invoiceId } = await params;
    const {
      businessAddress,
      lineItems,
      dueDate,
      notes,
      terms,
      customerDisplayName,
      customerEmail,
      customerInfo,
    } = await body<{
      businessAddress?: string;
      lineItems?: ILineItem[];
      dueDate?: Date | string;
      notes?: string;
      terms?: string;
      customerDisplayName?: string;
      customerEmail?: string;
      customerInfo?: { address?: string; phone?: string };
    }>(req);

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return bad('Invoice not found', 404);
    }

    // Verify ownership
    if (invoice.businessAddress !== businessAddress) {
      return bad('Not authorized to update this invoice', 403);
    }

    // Only allow editing drafts
    if (invoice.status !== 'draft') {
      return bad('Can only edit draft invoices', 400);
    }

    // Recalculate totals if line items changed
    if (lineItems) {
      let subtotal = 0;
      let taxTotal = 0;

      const processedLineItems = lineItems.map((item: ILineItem) => {
        const amount = item.quantity * item.unitPrice;
        const taxAmount = item.taxRate ? (amount * item.taxRate) / 100 : 0;

        subtotal += amount;
        taxTotal += taxAmount;

        return {
          ...item,
          amount,
          taxAmount,
        };
      });

      invoice.lineItems = processedLineItems;
      invoice.subtotal = subtotal;
      invoice.taxTotal = taxTotal;
      invoice.total = subtotal + taxTotal;
    }

    if (dueDate) invoice.dueDate = dueDate as Date;
    if (notes !== undefined) invoice.notes = notes;
    if (terms !== undefined) invoice.terms = terms;
    if (customerDisplayName) invoice.customerDisplayName = customerDisplayName;
    if (customerEmail !== undefined) invoice.customerEmail = customerEmail;
    if (customerInfo) invoice.customerInfo = customerInfo;

    await invoice.save();

    return ok({ invoice });
  }
);

// DELETE /api/invoices/:invoiceId - Delete a draft invoice
export const DELETE = handler(
  async (req: Request, { params }: { params: Promise<{ invoiceId: string }> }) => {
    const { invoiceId } = await params;
    const businessAddress = q(req, 'businessAddress');

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return bad('Invoice not found', 404);
    }

    if (invoice.businessAddress !== businessAddress) {
      return bad('Not authorized', 403);
    }

    // Only allow deleting drafts
    if (invoice.status !== 'draft') {
      return bad('Can only delete draft invoices', 400);
    }

    await Invoice.findByIdAndDelete(invoiceId);

    return ok({ message: 'Invoice deleted' });
  }
);
