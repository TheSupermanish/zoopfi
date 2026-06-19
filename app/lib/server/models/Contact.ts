import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  userId: mongoose.Types.ObjectId;
  userAddress: string;
  contactUsername: string;
  contactAddress: string;
  nickname?: string;
  createdAt: Date;
}

const ContactSchema = new Schema<IContact>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userAddress: {
    type: String,
    required: true,
  },
  contactUsername: {
    type: String,
    required: true,
  },
  contactAddress: {
    type: String,
    required: true,
  },
  nickname: {
    type: String,
    maxlength: 50,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to prevent duplicate contacts
ContactSchema.index({ userAddress: 1, contactUsername: 1 }, { unique: true });

export const Contact = (mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema)) as mongoose.Model<IContact>;

