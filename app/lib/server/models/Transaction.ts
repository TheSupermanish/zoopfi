import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType = 'send' | 'receive' | 'reward';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface ITransaction extends Document {
  senderAddress: string;
  senderUsername: string;
  receiverAddress: string;
  receiverUsername: string;
  amount: number;
  txHash: string;
  status: TransactionStatus;
  type: TransactionType;
  timestamp: Date;
  note?: string;
}

const TransactionSchema = new Schema<ITransaction>({
  senderAddress: {
    type: String,
    required: true,
  },
  senderUsername: {
    type: String,
    required: true,
  },
  receiverAddress: {
    type: String,
    required: true,
  },
  receiverUsername: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  txHash: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
  },
  type: {
    type: String,
    enum: ['send', 'receive', 'reward'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  note: {
    type: String,
    maxlength: 200,
  },
});

// Indexes for efficient querying
TransactionSchema.index({ senderAddress: 1, timestamp: -1 });
TransactionSchema.index({ receiverAddress: 1, timestamp: -1 });
// Note: txHash index is auto-created due to unique: true

export const Transaction = (mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema)) as mongoose.Model<ITransaction>;

