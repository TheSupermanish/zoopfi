export const runtime = 'nodejs';
import { handler, bad } from '@/app/lib/server/route-utils';
import { Invoice, IInvoice } from '@/app/lib/server/models';

// Minimal structural type for the slice of pdfkit's API we use. Avoids a hard
// dependency on @types/pdfkit (which may not be installed in this package).
interface PdfDoc {
  on(event: 'data', cb: (chunk: Buffer) => void): void;
  on(event: 'end', cb: () => void): void;
  on(event: 'error', cb: () => void): void;
  fontSize(n: number): PdfDoc;
  text(t: string, opts?: Record<string, unknown>): PdfDoc;
  moveDown(n?: number): PdfDoc;
  end(): void;
}

// Build the invoice PDF into a Buffer using pdfkit. Returns null if pdfkit is
// unavailable so the route can degrade gracefully instead of crashing.
async function buildInvoicePdf(invoice: IInvoice): Promise<Buffer | null> {
  let PDFDocument: new (opts?: Record<string, unknown>) => PdfDoc;
  try {
    // pdfkit is loaded dynamically and may not be installed; keep untyped.
    const mod = (await import('pdfkit' as string)) as { default: unknown };
    PDFDocument = (mod.default ?? mod) as new (opts?: Record<string, unknown>) => PdfDoc;
  } catch {
    return null;
  }

  return new Promise<Buffer | null>((resolve) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', () => resolve(null));

      // Header
      doc.fontSize(20).text(`Invoice ${invoice.invoiceNumber}`, { align: 'right' });
      doc.moveDown();

      // Business
      doc.fontSize(12).text(`From: ${invoice.businessDisplayName} (@${invoice.businessUsername})`);
      if (invoice.businessInfo?.email) doc.text(`Email: ${invoice.businessInfo.email}`);
      if (invoice.businessInfo?.phone) doc.text(`Phone: ${invoice.businessInfo.phone}`);
      if (invoice.businessInfo?.address) doc.text(`Address: ${invoice.businessInfo.address}`);
      doc.moveDown();

      // Customer
      doc.text(`To: ${invoice.customerDisplayName}`);
      if (invoice.customerEmail) doc.text(`Email: ${invoice.customerEmail}`);
      if (invoice.customerAddress) doc.text(`Wallet: ${invoice.customerAddress}`);
      doc.moveDown();

      // Dates
      doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`);
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`);
      doc.text(`Status: ${invoice.status}`);
      doc.moveDown();

      // Line items
      doc.fontSize(14).text('Line Items');
      doc.fontSize(11);
      for (const item of invoice.lineItems) {
        const tax = item.taxAmount ? ` (tax ${item.taxAmount})` : '';
        doc.text(
          `${item.description}  x${item.quantity} @ ${item.unitPrice} = ${item.amount}${tax}`
        );
      }
      doc.moveDown();

      // Totals
      doc.fontSize(12).text(`Subtotal: ${invoice.subtotal} ${invoice.currency}`);
      doc.text(`Tax: ${invoice.taxTotal} ${invoice.currency}`);
      doc.fontSize(14).text(`Total: ${invoice.total} ${invoice.currency}`);

      if (invoice.notes) {
        doc.moveDown();
        doc.fontSize(11).text(`Notes: ${invoice.notes}`);
      }
      if (invoice.terms) {
        doc.moveDown();
        doc.fontSize(11).text(`Terms: ${invoice.terms}`);
      }

      doc.end();
    } catch {
      resolve(null);
    }
  });
}

// GET /api/invoices/:invoiceId/pdf - Render an invoice as a PDF
export const GET = handler(
  async (_req: Request, { params }: { params: Promise<{ invoiceId: string }> }) => {
    const { invoiceId } = await params;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return bad('Invoice not found', 404);
    }

    const pdf = await buildInvoicePdf(invoice);
    if (!pdf) {
      return bad('PDF generation unavailable', 501);
    }

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  }
);
