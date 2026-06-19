import mongoose, { Document, Schema } from 'mongoose';

export type RequestStatus = 'pending' | 'paid' | 'cancelled' | 'expired';

export interface IPaymentRequest extends Document {
  requesterId: mongoose.Types.ObjectId;
  requesterAddress: string;
  requesterUsername: string;
  payerUsername?: string;
  payerAddress?: string;
  amount: number;
  message?: string;
  status: RequestStatus;
  txHash?: string;
  createdAt: Date;
  expiresAt: Date;
}

const PaymentRequestSchema = new Schema<IPaymentRequest>({
  requesterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  requesterAddress: {
    type: String,
    required: true,
  },
  requesterUsername: {
    type: String,
    required: true,
  },
  payerUsername: {
    type: String,
  },
  payerAddress: {
    type: String,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  message: {
    type: String,
    maxlength: 200,
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled', 'expired'],
    default: 'pending',
  },
  txHash: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// Indexes
PaymentRequestSchema.index({ requesterAddress: 1, status: 1 });
PaymentRequestSchema.index({ payerAddress: 1, status: 1 });
PaymentRequestSchema.index({ expiresAt: 1 });

export const PaymentRequest = (mongoose.models.PaymentRequest || mongoose.model<IPaymentRequest>('PaymentRequest', PaymentRequestSchema)) as mongoose.Model<IPaymentRequest>;

