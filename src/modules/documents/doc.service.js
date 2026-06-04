import Document from './doc.model.js';
import Job from './job.model.js';
import AppError from '../../utils/AppError.js';
import { uploadStreamToCloudinary } from '../../config/cloudinary.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Upload buffer to Cloudinary, save Mongoose records, and trigger FastAPI AI System
 */
export const createDocument = async ({
  name,
  type,
  size,
  ownerId,
  fileBuffer,
  options = {}
}) => {
  // 1. Stream the file buffer to Cloudinary ($0 storage CDN)
  let cloudinaryResult;
  try {
    cloudinaryResult = await uploadStreamToCloudinary(fileBuffer, name);
  } catch (error) {
    console.error('Cloudinary upload failure:', error.message);
    throw new AppError('File upload failed. Please try again.', 500);
  }

  // 2. Create the Document in MongoDB Atlas
  const document = await Document.create({
    name,
    type,
    size,
    ownerId,
    fileUrl: cloudinaryResult.secure_url,
    status: 'Processing',
    tags: options.tags || []
  });

  // 3. Create the Job record representing the async steps
  const steps = [
    { name: 'OCR', status: 'pending' },
    { name: 'Translate', status: options.translate ? 'pending' : 'done' },
    { name: 'Extract', status: options.extract ? 'pending' : 'done' },
    { name: 'Embed', status: 'pending' }
  ];

  const job = await Job.create({
    documentId: document._id,
    status: 'Queued',
    progress: 0,
    steps
  });

  // 4. Trigger the Python FastAPI AI service asynchronously (Non-blocking)
  const triggerPayload = {
    document_id: document._id.toString(),
    file_url: cloudinaryResult.secure_url,
    ocr: options.ocr !== false,
    translate: options.translate === true,
    target_lang: options.targetLang || 'en',
    extract: options.extract !== false
  };

  // We perform this fetch in background (non-blocking) and catch failures
  fetch(`${AI_SERVICE_URL}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(triggerPayload)
  })
    .then(async (res) => {
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`AI Service rejected trigger: ${errorText}`);
      }
      console.log(`📡 AI Service successfully triggered for Doc: ${document._id}`);
    })
    .catch(async (error) => {
      console.error(`❌ Failed to trigger AI Microservice for Doc: ${document._id}:`, error.message);
      
      // Update DB job state to Failed so it reflects on user's DLQ retry interface
      await Document.findByIdAndUpdate(document._id, { status: 'Failed' });
      await Job.findByIdAndUpdate(job._id, {
        status: 'Failed',
        error: `AI Pipeline connection error: ${error.message}`,
        'steps.0.status': 'failed' // mark first step as failed
      });
    });

  return { document, job };
};

/**
 * Query documents matching owners and filters
 */
export const getUserDocuments = async (userId, queryOptions = {}) => {
  const filter = { ownerId: userId };

  // Text search on name
  if (queryOptions.q) {
    filter.name = { $regex: queryOptions.q, $options: 'i' };
  }

  // Type filter
  if (queryOptions.type && queryOptions.type !== 'All') {
    filter.type = queryOptions.type;
  }

  // Star status filter
  if (queryOptions.starred === 'true') {
    filter.starred = true;
  }

  // Return query execution sorted by latest uploads
  return await Document.find(filter).sort({ createdAt: -1 });
};

/**
 * Fetch full document matching ID
 */
export const getDocumentById = async (docId, userId) => {
  const document = await Document.findOne({ _id: docId, ownerId: userId });
  if (!document) {
    throw new AppError('Document not found or unauthorized access', 404);
  }
  return document;
};

/**
 * Update document fields (like rename, starred status, tags)
 */
export const updateDocument = async (docId, userId, updateData) => {
  const permittedUpdates = {};
  if (updateData.name) permittedUpdates.name = updateData.name;
  if (updateData.starred !== undefined) permittedUpdates.starred = updateData.starred;
  if (updateData.tags) permittedUpdates.tags = updateData.tags;

  const document = await Document.findOneAndUpdate(
    { _id: docId, ownerId: userId },
    permittedUpdates,
    { new: true, runValidators: true }
  );

  if (!document) {
    throw new AppError('Document not found or unauthorized access', 404);
  }

  return document;
};

/**
 * Delete document from MongoDB & delete its active job
 */
export const deleteDocumentRecord = async (docId, userId) => {
  const document = await Document.findOneAndDelete({ _id: docId, ownerId: userId });
  
  if (!document) {
    throw new AppError('Document not found or unauthorized access', 404);
  }

  // Delete matching background pipeline tracking jobs
  await Job.deleteMany({ documentId: docId });

  // Note: Vector matches should be cleared from Pinecone inside the AI service.
  // We can trigger an asynchronous delete call to the Python service
  fetch(`${AI_SERVICE_URL}/delete/${docId}`, { method: 'DELETE' })
    .catch((err) => console.error(`⚠️ Failed to trigger Pinecone vectors deletion for ${docId}:`, err.message));

  return document;
};
