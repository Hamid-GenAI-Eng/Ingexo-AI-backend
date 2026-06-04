import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [80, 'Workspace name cannot exceed 80 characters']
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Workspace must belong to an owner']
    }
  },
  {
    timestamps: true
  }
);

// Indexes
workspaceSchema.index({ ownerId: 1 });

const Workspace = mongoose.model('Workspace', workspaceSchema);

export default Workspace;
