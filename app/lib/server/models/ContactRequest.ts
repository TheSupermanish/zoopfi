import mongoose, { Schema, Document } from 'mongoose';

export interface IContactRequest extends Document {
  senderAddress: string;
  senderUsername: string;
  receiverAddress: string;
  receiverUsername: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactRequestSchema = new Schema<IContactRequest>(
  {
    senderAddress: {
      type: String,
      required: true,
      index: true,
    },
    senderUsername: {
      type: String,
      required: true,
    },
    receiverAddress: {
      type: String,
      required: true,
      index: true,
    },
    receiverUsername: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    message: {
      type: String,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate requests
ContactRequestSchema.index(
  { senderAddress: 1, receiverAddress: 1 },
  { unique: true }
);

export default (mongoose.models.ContactRequest || mongoose.model<IContactRequest>('ContactRequest', ContactRequestSchema)) as mongoose.Model<IContactRequest>;

