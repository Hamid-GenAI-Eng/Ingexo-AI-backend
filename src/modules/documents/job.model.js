import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Job must be linked to a document']
    },
    status: {
      type: String,
      enum: {
        values: ['Queued', 'OCR', 'Translating', 'Extracting', 'Embedding', 'Complete', 'Failed'],
        message: 'Status must be Queued, OCR, Translating, Extracting, Embedding, Complete, or Failed'
      },
      default: 'Queued'
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    error: {
      type: String,
      trim: true
    },
    steps: [
      {
        name: {
          type: String,
          required: true
        },
        status: {
          type: String,
          enum: ['pending', 'active', 'done', 'failed'],
          default: 'pending'
        },
        error: {
          type: String
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Indexes
jobSchema.index({ documentId: 1 });

const Job = mongoose.model('Job', jobSchema);

export default Job;
