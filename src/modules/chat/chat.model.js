import mongoose from 'mongoose';

const citationSchema = new mongoose.Schema({
  doc: {
    type: String,
    required: true
  },
  page: {
    type: Number,
    default: 1
  },
  quote: {
    type: String,
    required: true
  }
});

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  citations: [citationSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const messageThreadSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title for the conversation'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true
    },
    messages: [messageSchema]
  },
  {
    timestamps: true
  }
);

// Indexes for fast lookup
messageThreadSchema.index({ workspaceId: 1 });
messageThreadSchema.index({ userId: 1 });

const MessageThread = mongoose.model('MessageThread', messageThreadSchema);

export default MessageThread;
