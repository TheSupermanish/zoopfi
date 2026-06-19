export const runtime = 'nodejs';
import { handler, ok, bad, body, q } from '@/app/lib/server/route-utils';
import { Invoice, User, ILineItem, InvoiceStatus } from '@/app/lib/server/models';
import { generateInvoiceNumber } from '@/app/lib/server/invoiceNumbering';

// GET /api/invoices - Get invoices for a user (business or customer view)
export const GET = handler(async (req: Request) => {
  const address = q(req, 'address');
  const role = q(req, 'role') ?? 'business';
  const status = q(req, 'status');

  if (!address) {
    return bad('Wallet address is required', 400);
  }

  const query: Record<string, unknown> = {};

  if (role === 'business') {
    query.businessAddress = address;
  } else if (role === 'customer') {
    query.customerAddress = address;
  }

  if (status && status !== 'all') {
    query.status = status;
  }

  const invoices = await Invoice.find(query)
    .sort({ createdAt: -1 })
    .limit(100);

  return ok({ invoices });
});

// POST /api/invoices - Create a new invoice
export const POST = handler(async (req: Request) => {
  const {
    businessAddress,
    customerDisplayName,
    customerEmail,
    customerAddress,
    customerUsername,
    lineItems,
    dueDate,
    notes,
    terms,
    customerInfo,
    status = 'draft',
  } = await body<{
    businessAddress?: string;
    customerDisplayName?: string;
    customerEmail?: string;
    customerAddress?: string;
    customerUsername?: string;
    lineItems?: ILineItem[];
    dueDate?: Date | string;
    notes?: string;
    terms?: string;
    customerInfo?: { address?: string; phone?: string };
    status?: string;
  }>(req);

  if (!businessAddress || !customerDisplayName || !lineItems || lineItems.length === 0) {
    return bad('Business, customer, and line items are required', 400);
  }

  // Verify business account
  const business = await User.findOne({ walletAddress: businessAddress });
  if (!business) {
    return bad('Business not found', 404);
  }

  if (business.accountType !== 'business') {
    return bad('Only business accounts can create invoices', 403);
  }

  // Calculate totals
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

  const total = subtotal + taxTotal;

  // Get customer info if they're a registered user
  let customerId = undefined;
  let customerUser = null;

  if (customerAddress) {
    customerUser = await User.findOne({ walletAddress: customerAddress });
    if (customerUser) {
      customerId = customerUser._id;
    }
  } else if (customerUsername) {
    customerUser = await User.findOne({ username: customerUsername.toLowerCase() });
    if (customerUser) {
      customerId = customerUser._id;
    }
  }

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(businessAddress);

  // Create invoice
  const invoice = await Invoice.create({
    invoiceNumber,
    businessId: business._id,
    businessAddress,
    businessUsername: business.username,
    businessDisplayName: business.displayName,
    businessInfo: {
      address: business.businessInfo?.address,
      email: business.email,
      phone: business.phone,
    },
    customerId,
    customerAddress: customerUser?.walletAddress || customerAddress,
    customerUsername: customerUser?.username || customerUsername,
    customerDisplayName,
    customerEmail: customerEmail || customerUser?.email,
    customerInfo,
    lineItems: processedLineItems,
    subtotal,
    taxTotal,
    total,
    issueDate: new Date(),
    dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
    notes,
    terms,
    status: status as InvoiceStatus,
  });

  return ok({ invoice }, 201);
});
