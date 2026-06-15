import { Router, Request, Response } from 'express';
import { Invoice } from '../models/Invoice';
import { User } from '../models/User';
import { generateInvoiceNumber } from '../utils/invoiceNumbering';

const router = Router();

// GET /api/invoices - Get invoices for a user (business or customer view)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { address, role = 'business', status } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const query: any = {};

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

    res.json({ invoices });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices/:id - Get a specific invoice
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invoices - Create a new invoice
router.post('/', async (req: Request, res: Response) => {
  try {
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
    } = req.body;

    if (!businessAddress || !customerDisplayName || !lineItems || lineItems.length === 0) {
      return res.status(400).json({ error: 'Business, customer, and line items are required' });
    }

    // Verify business account
    const business = await User.findOne({ walletAddress: businessAddress });
    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    if (business.accountType !== 'business') {
      return res.status(403).json({ error: 'Only business accounts can create invoices' });
    }

    // Calculate totals
    let subtotal = 0;
    let taxTotal = 0;

    const processedLineItems = lineItems.map((item: any) => {
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
        // Update customerAddress if found
        req.body.customerAddress = customerUser.walletAddress;
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
      status,
    });

    res.status(201).json({ invoice });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/invoices/:id - Update an invoice (draft only)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { businessAddress, lineItems, dueDate, notes, terms, customerDisplayName, customerEmail, customerInfo } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Verify ownership
    if (invoice.businessAddress !== businessAddress) {
      return res.status(403).json({ error: 'Not authorized to update this invoice' });
    }

    // Only allow editing drafts
    if (invoice.status !== 'draft') {
      return res.status(400).json({ error: 'Can only edit draft invoices' });
    }

    // Recalculate totals if line items changed
    if (lineItems) {
      let subtotal = 0;
      let taxTotal = 0;

      const processedLineItems = lineItems.map((item: any) => {
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

    if (dueDate) invoice.dueDate = dueDate;
    if (notes !== undefined) invoice.notes = notes;
    if (terms !== undefined) invoice.terms = terms;
    if (customerDisplayName) invoice.customerDisplayName = customerDisplayName;
    if (customerEmail !== undefined) invoice.customerEmail = customerEmail;
    if (customerInfo) invoice.customerInfo = customerInfo;

    await invoice.save();

    res.json({ invoice });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invoices/:id/send - Send an invoice (draft → sent)
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { businessAddress } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.businessAddress !== businessAddress) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (invoice.status !== 'draft') {
      return res.status(400).json({ error: 'Can only send draft invoices' });
    }

    invoice.status = 'sent';
    await invoice.save();

    // TODO: Trigger email sending here

    res.json({ invoice, message: 'Invoice sent successfully' });
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invoices/:id/pay - Mark invoice as paid
router.post('/:id/pay', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { txHash, amount, customerAddress } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Verify customer authorization
    if (invoice.customerAddress !== customerAddress) {
      return res.status(403).json({ error: 'Not authorized to pay this invoice' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }

    if (invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot pay cancelled invoice' });
    }

    invoice.status = 'paid';
    invoice.paidDate = new Date();
    invoice.txHash = txHash;
    invoice.paidAmount = amount || invoice.total;

    await invoice.save();

    res.json({ invoice, message: 'Invoice marked as paid' });
  } catch (error) {
    console.error('Pay invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invoices/:id/cancel - Cancel an invoice
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { businessAddress } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.businessAddress !== businessAddress) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot cancel paid invoice' });
    }

    invoice.status = 'cancelled';
    await invoice.save();

    res.json({ invoice, message: 'Invoice cancelled' });
  } catch (error) {
    console.error('Cancel invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/invoices/:id - Delete a draft invoice
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { businessAddress } = req.query;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.businessAddress !== businessAddress) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Only allow deleting drafts
    if (invoice.status !== 'draft') {
      return res.status(400).json({ error: 'Can only delete draft invoices' });
    }

    await Invoice.findByIdAndDelete(id);

    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
