import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [50, 'Full name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [
        function () {
          return this.authProvider === 'local';
        },
        'Password is required for local authentication'
      ],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false // Exclude from query results by default for safety
    },
    authProvider: {
      type: String,
      enum: {
        values: ['local', 'google'],
        message: 'Auth provider must be either local or google'
      },
      default: 'local'
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true // Allows multiple null/undefined values for local users
    },
    avatar: {
      type: String,
      default: function () {
        // Return a default initials gravatar if avatar not defined
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.fullName)}&background=random`;
      }
    },
    role: {
      type: String,
      enum: {
        values: ['owner', 'admin', 'editor', 'viewer'],
        message: 'Role must be owner, admin, editor, or viewer'
      },
      default: 'owner'
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace'
    },
    resetPasswordOtp: {
      type: String
    },
    resetPasswordOtpExpires: {
      type: Date
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt automatic fields
  }
);

// Pre-save middleware to hash password asynchronously
userSchema.pre('save', async function (next) {
  // Only hash password if it has been modified or is new
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check if password is correct
userSchema.methods.comparePassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);

export default User;
