import mongoose, { Document, Schema } from 'mongoose';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface ILineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
}

export interface IInvoice extends Document {
  // Invoice Numbering
  invoiceNumber: string;

  // Business (issuer)
  businessId: mongoose.Types.ObjectId;
  businessAddress: string;
  businessUsername: string;
  businessDisplayName: string;
  businessInfo?: {
    address?: string;
    email?: string;
    phone?: string;
  };

  // Customer (recipient)
  customerId?: mongoose.Types.ObjectId;
  customerAddress?: string;
  customerUsername?: string;
  customerDisplayName: string;
  customerEmail?: string;
  customerInfo?: {
    address?: string;
    phone?: string;
  };

  // Financial Details
  lineItems: ILineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  currency: string;

  // Status & Dates
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;

  // Payment
  txHash?: string;
  paidAmount?: number;

  // Additional Info
  notes?: string;
  terms?: string;

  // Recurring Info
  recurringInvoiceId?: mongoose.Types.ObjectId;

  // PDF storage
  pdfUrl?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const LineItemSchema = new Schema<ILineItem>({
  description: {
    type: String,
    required: true,
    maxlength: 500,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  taxRate: {
    type: Number,
    min: 0,
    max: 100,
  },
  taxAmount: {
    type: Number,
    min: 0,
  },
}, { _id: false });

const InvoiceSchema = new Schema<IInvoice>({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  businessAddress: {
    type: String,
    required: true,
    index: true,
  },
  businessUsername: {
    type: String,
    required: true,
  },
  businessDisplayName: {
    type: String,
    required: true,
  },
  businessInfo: {
    address: String,
    email: String,
    phone: String,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  customerAddress: {
    type: String,
  },
  customerUsername: {
    type: String,
  },
  customerDisplayName: {
    type: String,
    required: true,
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  customerInfo: {
    address: String,
    phone: String,
  },
  lineItems: {
    type: [LineItemSchema],
    required: true,
    validate: [
      {
        validator: (items: ILineItem[]) => items.length > 0,
        message: 'At least one line item is required',
      },
    ],
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  taxTotal: {
    type: Number,
    default: 0,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'MOVE',
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
  },
  issueDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: true,
    index: true,
  },
  paidDate: {
    type: Date,
  },
  txHash: {
    type: String,
  },
  paidAmount: {
    type: Number,
    min: 0,
  },
  notes: {
    type: String,
    maxlength: 1000,
  },
  terms: {
    type: String,
    maxlength: 1000,
  },
  recurringInvoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'RecurringInvoice',
  },
  pdfUrl: {
    type: String,
  },
}, {
  timestamps: true,
});

// Compound Indexes
InvoiceSchema.index({ businessAddress: 1, status: 1 });
InvoiceSchema.index({ customerAddress: 1, status: 1 });
InvoiceSchema.index({ dueDate: 1, status: 1 });
InvoiceSchema.index({ createdAt: -1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
