import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupMember {
  username: string;
  walletAddress: string;
  balance: number; // positive = owed to them, negative = they owe
  joinedAt: Date;
}

export interface IGroup extends Document {
  name: string;
  description?: string;
  icon: string; // emoji or icon name
  color: string; // hex color
  creatorAddress: string;
  creatorUsername: string;
  members: IGroupMember[];
  totalSpent: number;
  currency: string;
  isSettled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GroupMemberSchema = new Schema<IGroupMember>({
  username: { type: String, required: true },
  walletAddress: { type: String, required: true },
  balance: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
});

const GroupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: true,
      maxlength: 50,
    },
    description: {
      type: String,
      maxlength: 200,
    },
    icon: {
      type: String,
      default: '👥',
    },
    color: {
      type: String,
      default: '#7f13ec',
    },
    creatorAddress: {
      type: String,
      required: true,
      index: true,
    },
    creatorUsername: {
      type: String,
      required: true,
    },
    members: [GroupMemberSchema],
    totalSpent: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'MOVE',
    },
    isSettled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding groups by member
GroupSchema.index({ 'members.walletAddress': 1 });

export default mongoose.model<IGroup>('Group', GroupSchema);

