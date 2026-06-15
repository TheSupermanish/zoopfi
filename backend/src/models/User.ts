import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  walletAddress: string;
  createdAt: Date;
  totalSent: number;
  totalReceived: number;
  streak: number;
  lastActivityDate: Date | null;
  transferCount: number;
}

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: /^[a-z0-9_]+$/,
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  totalSent: {
    type: Number,
    default: 0,
  },
  totalReceived: {
    type: Number,
    default: 0,
  },
  streak: {
    type: Number,
    default: 0,
  },
  lastActivityDate: {
    type: Date,
    default: null,
  },
  transferCount: {
    type: Number,
    default: 0,
  },
});

// Note: indexes on walletAddress and username are auto-created due to unique: true

export const User = mongoose.model<IUser>('User', UserSchema);

