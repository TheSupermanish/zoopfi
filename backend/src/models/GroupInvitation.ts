import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupInvitation extends Document {
  groupId: mongoose.Types.ObjectId;
  groupName: string;
  groupIcon: string;
  groupColor: string;
  invitedUsername: string;
  invitedAddress: string;
  inviterUsername: string;
  inviterAddress: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

const GroupInvitationSchema = new Schema<IGroupInvitation>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    groupName: {
      type: String,
      required: true,
    },
    groupIcon: {
      type: String,
      default: '👥',
    },
    groupColor: {
      type: String,
      default: '#7f13ec',
    },
    invitedUsername: {
      type: String,
      required: true,
      index: true,
    },
    invitedAddress: {
      type: String,
      required: true,
      index: true,
    },
    inviterUsername: {
      type: String,
      required: true,
    },
    inviterAddress: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding pending invitations for a user
GroupInvitationSchema.index({ invitedAddress: 1, status: 1 });
// Compound index to prevent duplicate pending invitations
GroupInvitationSchema.index({ groupId: 1, invitedAddress: 1, status: 1 });

export default mongoose.model<IGroupInvitation>('GroupInvitation', GroupInvitationSchema);






