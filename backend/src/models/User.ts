import mongoose, { Document, Schema } from 'mongoose';

// Business info subdocument interface
export interface IBusinessInfo {
  ownerFirstName: string;
  ownerLastName: string;
  category: string;  // 'retail', 'food', 'services', 'technology', 'other'
  description?: string;
  address?: string;
  website?: string;
}

export interface IUser extends Document {
  // === Shared Fields (both account types) ===
  username: string;              // @handle for both
  walletAddress: string;
  accountType: 'personal' | 'business';
  displayName: string;           // "John Doe" or "Starbucks"
  avatarUrl?: string;            // Profile pic or business logo
  email?: string;                // Optional contact email
  phone?: string;                // Optional contact phone

  // === Private payments (shielded pool) ===
  notePubKey?: string;           // BN254 note public key (for receiving private transfers)
  encryptionPubKey?: string;     // X25519 key to encrypt note payloads to this user

  // === Stats (shared) ===
  createdAt: Date;
  totalSent: number;
  totalReceived: number;
  streak: number;
  lastActivityDate: Date | null;
  transferCount: number;

  // === Business-Only Fields (null for personal) ===
  businessInfo?: IBusinessInfo;
}

// Business info subdocument schema
const BusinessInfoSchema = new Schema<IBusinessInfo>({
  ownerFirstName: {
    type: String,
    required: true,
    trim: true,
  },
  ownerLastName: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['retail', 'food', 'services', 'technology', 'healthcare', 'entertainment', 'other'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  address: {
    type: String,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
}, { _id: false });

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
  accountType: {
    type: String,
    required: true,
    enum: ['personal', 'business'],
    default: 'personal',
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100,
  },
  avatarUrl: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  notePubKey: {
    type: String,
    trim: true,
  },
  encryptionPubKey: {
    type: String,
    trim: true,
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
  businessInfo: {
    type: BusinessInfoSchema,
    default: null,
  },
});

// Note: indexes on walletAddress and username are auto-created due to unique: true

export const User = mongoose.model<IUser>('User', UserSchema);

