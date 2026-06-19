export const runtime = 'nodejs';
import { handler, ok, bad, body } from '@/app/lib/server/route-utils';
import { Invoice, IInvoice } from '@/app/lib/server/models';

// Best-effort email delivery. Only attempts to send when SMTP is configured
// (SMTP_HOST present). Never throws: if nodemailer is missing or sending
// fails, we silently skip so the request still succeeds.
async function trySendInvoiceEmail(invoice: IInvoice): Promise<void> {
  if (!process.env.SMTP_HOST || !invoice.customerEmail) {
    return;
  }

  try {
    // nodemailer is loaded dynamically and may not be installed; keep untyped.
    const mod = (await import('nodemailer' as string)) as {
      createTransport: (opts: Record<string, unknown>) => {
        sendMail: (opts: Record<string, unknown>) => Promise<unknown>;
      };
      default?: {
        createTransport: (opts: Record<string, unknown>) => {
          sendMail: (opts: Record<string, unknown>) => Promise<unknown>;
        };
      };
    };
    const nodemailer = mod.default ?? mod;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });

    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: invoice.customerEmail,
      subject: `Invoice ${invoice.invoiceNumber} from ${invoice.businessDisplayName}`,
      text: `You have received invoice ${invoice.invoiceNumber} for a total of ${invoice.total} ${invoice.currency}. Due date: ${new Date(invoice.dueDate).toLocaleDateString()}.`,
    });
  } catch (e) {
    console.error('[api] invoice email send failed (best-effort):', (e as Error)?.message || e);
  }
}

// POST /api/invoices/:invoiceId/send - Send an invoice (draft -> sent)
export const POST = handler(
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

    if (invoice.status !== 'draft') {
      return bad('Can only send draft invoices', 400);
    }

    invoice.status = 'sent';
    await invoice.save();

    // Best-effort email (no-op unless SMTP env is configured).
    await trySendInvoiceEmail(invoice);

    return ok({ invoice, message: 'Invoice sent successfully' });
  }
);
