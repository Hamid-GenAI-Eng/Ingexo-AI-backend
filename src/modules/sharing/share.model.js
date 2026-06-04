import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const shareSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Share policy must be linked to a document']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Share policy must be created by a user']
    },
    token: {
      type: String,
      unique: true,
      required: [true, 'Share link secure token is required']
    },
    password: {
      type: String,
      select: false // Exclude from responses by default
    },
    expiresAt: {
      type: Date
    },
    allowedFields: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

// Indexes
shareSchema.index({ documentId: 1 });

// Pre-save hook to hash password if set or modified
shareSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password helper on instance
shareSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Share = mongoose.model('Share', shareSchema);

export default Share;
