import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true
    },
    type: {
      type: String,
      enum: {
        values: ['Invoice', 'Contract', 'Report', 'Receipt', 'Lease', 'Memo'],
        message: 'Type must be Invoice, Contract, Report, Receipt, Lease, or Memo'
      },
      required: [true, 'Document type is required']
    },
    pages: {
      type: Number,
      default: 1
    },
    size: {
      type: Number,
      required: [true, 'Document size in bytes is required']
    },
    status: {
      type: String,
      enum: {
        values: ['Ready', 'Processing', 'Failed'],
        message: 'Status must be Ready, Processing, or Failed'
      },
      default: 'Processing'
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    starred: {
      type: Boolean,
      default: false
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Document must belong to an owner']
    },
    summary: {
      type: String,
      trim: true
    },
    fileUrl: {
      type: String,
      required: [true, 'Cloudinary file URL is required']
    },
    originalText: {
      type: String
    },
    translatedText: {
      type: String
    },
    languageDetected: {
      type: String
    },
    extractedFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Indexes for high-speed searching
documentSchema.index({ ownerId: 1 });
documentSchema.index({ name: 'text', tags: 'text' }); // Allows fast standard text search on titles/tags

const Document = mongoose.model('Document', documentSchema);

export default Document;
