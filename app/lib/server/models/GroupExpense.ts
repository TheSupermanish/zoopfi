import mongoose, { Schema, Document } from 'mongoose';

export interface IExpenseSplit {
  username: string;
  walletAddress: string;
  amount: number; // how much they owe for this expense
  paid: boolean;
}

export interface IGroupExpense extends Document {
  groupId: mongoose.Types.ObjectId;
  description: string;
  amount: number;
  currency: string;
  category: string;
  paidByAddress: string;
  paidByUsername: string;
  splitType: 'equal' | 'exact' | 'percentage';
  splits: IExpenseSplit[];
  receipt?: string; // URL to receipt image
  txHash?: string; // if settled on-chain
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSplitSchema = new Schema<IExpenseSplit>({
  username: { type: String, required: true },
  walletAddress: { type: String, required: true },
  amount: { type: Number, required: true },
  paid: { type: Boolean, default: false },
});

const GroupExpenseSchema = new Schema<IGroupExpense>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 200,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'MOVE',
    },
    category: {
      type: String,
      default: 'other',
      enum: ['food', 'transport', 'lodging', 'entertainment', 'shopping', 'utilities', 'other'],
    },
    paidByAddress: {
      type: String,
      required: true,
    },
    paidByUsername: {
      type: String,
      required: true,
    },
    splitType: {
      type: String,
      enum: ['equal', 'exact', 'percentage'],
      default: 'equal',
    },
    splits: [ExpenseSplitSchema],
    receipt: String,
    txHash: String,
  },
  {
    timestamps: true,
  }
);

export default (mongoose.models.GroupExpense || mongoose.model<IGroupExpense>('GroupExpense', GroupExpenseSchema)) as mongoose.Model<IGroupExpense>;

