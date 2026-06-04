import mongoose from 'mongoose';

const inviteSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Invite must be linked to a workspace']
    },
    email: {
      type: String,
      required: [true, 'Invite email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'editor', 'viewer'],
        message: 'Role must be admin, editor, or viewer'
      },
      default: 'editor'
    },
    token: {
      type: String,
      unique: true,
      required: [true, 'Invite secure token is required']
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviting user is required']
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days expiry
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'expired'],
        message: 'Status must be pending, accepted, or expired'
      },
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
inviteSchema.index({ email: 1, workspaceId: 1 }, { unique: true }); // Prevent duplicate active invites to the same email in one workspace

const WorkspaceInvite = mongoose.model('WorkspaceInvite', inviteSchema);

export default WorkspaceInvite;
