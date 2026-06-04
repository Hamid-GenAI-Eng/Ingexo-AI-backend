import {
  createDocument,
  getUserDocuments,
  getDocumentById,
  updateDocument,
  deleteDocumentRecord
} from './doc.service.js';
import Document from './doc.model.js';
import Job from './job.model.js';
import { sendSuccess } from '../../utils/responseHandler.js';
import AppError from '../../utils/AppError.js';

const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

/**
 * @desc    Upload new multi-page document to Cloudinary and queue AI processing
 * @route   POST /api/documents
 * @access  Private (Guarded by auth.protect)
 */
export const uploadDocument = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please provide a document file to upload', 400));
  }

  const { name, type, ocr, translate, targetLang, extract, tags } = req.body;

  // Validate required file properties
  if (!type) {
    return next(new AppError('Please specify the document type (e.g. Invoice, Contract)', 400));
  }

  // Set processing flags based on incoming text parameters (multer passes fields as text)
  const processingOptions = {
    ocr: ocr !== 'false',
    translate: translate === 'true',
    targetLang: targetLang || 'en',
    extract: extract !== 'false',
    tags: tags ? tags.split(',').map(t => t.trim()) : []
  };

  // Run the service layer (uploads buffer to Cloudinary and saves database rows)
  const { document, job } = await createDocument({
    name: name || req.file.originalname,
    type,
    size: req.file.size,
    ownerId: req.user._id,
    fileBuffer: req.file.buffer,
    options: processingOptions
  });

  sendSuccess(res, 202, { document, job }, 'Document uploaded successfully and queued for AI analysis');
});

/**
 * @desc    Get all documents for the active logged-in user
 * @route   GET /api/documents
 * @access  Private
 */
export const getDocuments = catchAsync(async (req, res, next) => {
  const { q, type, starred } = req.query;

  const documents = await getUserDocuments(req.user._id, { q, type, starred });

  sendSuccess(res, 200, { documents });
});

/**
 * @desc    Get complete side-by-side details for a single document
 * @route   GET /api/documents/:id
 * @access  Private
 */
export const getDocumentDetails = catchAsync(async (req, res, next) => {
  const document = await getDocumentById(req.params.id, req.user._id);
  
  // Also fetch the active pipeline job state
  const job = await Job.findOne({ documentId: req.params.id });

  sendSuccess(res, 200, { document, job });
});

/**
 * @desc    Update document metadata (rename, star, tag list)
 * @route   PATCH /api/documents/:id
 * @access  Private
 */
export const updateDoc = catchAsync(async (req, res, next) => {
  const document = await updateDocument(req.params.id, req.user._id, req.body);
  sendSuccess(res, 200, { document }, 'Document updated successfully');
});

/**
 * @desc    Delete document from MongoDB and vector space
 * @route   DELETE /api/documents/:id
 * @access  Private
 */
export const deleteDoc = catchAsync(async (req, res, next) => {
  const document = await deleteDocumentRecord(req.params.id, req.user._id);
  sendSuccess(res, 200, { documentId: document._id }, 'Document successfully deleted');
});

/**
 * @desc    Webhook callback endpoint hit by the Python FastAPI service on pipeline completion
 * @route   POST /api/documents/webhook-callback
 * @access  Public (Secret token verification can be added for security)
 */
export const webhookCallback = catchAsync(async (req, res, next) => {
  const {
    document_id,
    status,
    original_text,
    translated_text,
    language_detected,
    summary,
    extracted_fields,
    error
  } = req.body;

  if (!document_id) {
    return next(new AppError('Missing document ID parameter', 400));
  }

  // 1. Locate matching Document and Job
  const document = await Document.findById(document_id);
  const job = await Job.findOne({ documentId: document_id });

  if (!document || !job) {
    return next(new AppError('Matching document or ingestion job not found', 404));
  }

  // 2. If status is successful: Update Document results and Job status
  if (status === 'success') {
    document.status = 'Ready';
    document.originalText = original_text;
    document.translatedText = translated_text;
    document.languageDetected = language_detected;
    document.summary = summary;
    document.extractedFields = extracted_fields || {};
    await document.save();

    job.status = 'Complete';
    job.progress = 100;
    // Mark all steps in pipeline as done
    job.steps = job.steps.map(s => ({ ...s, status: 'done' }));
    await job.save();

    console.log(`✅ Ingestion pipeline completely finished for Doc: ${document._id}`);
  } else {
    // 3. If failed: Update failures on Document and Job DLQ
    document.status = 'Failed';
    await document.save();

    job.status = 'Failed';
    job.error = error || 'Unknown pipeline exception';
    // Mark pending steps as failed
    job.steps = job.steps.map(s => {
      if (s.status === 'pending' || s.status === 'active') {
        return { ...s, status: 'failed', error: error || 'Pipeline failed' };
      }
      return s;
    });
    await job.save();

    console.error(`❌ Ingestion pipeline failed for Doc: ${document._id}: ${error}`);
  }

  sendSuccess(res, 200, {}, 'Webhook completion callback processed successfully');
});

/**
 * @desc    Get all background jobs for the user
 * @route   GET /api/documents/jobs/queue
 * @access  Private
 */
export const getJobs = catchAsync(async (req, res, next) => {
  // Find all documents uploaded by this user
  const docs = await Document.find({ ownerId: req.user._id });
  const docIds = docs.map(d => d._id);

  // Find all jobs matching these documents
  const jobs = await Job.find({ documentId: { $in: docIds } }).sort({ createdAt: -1 });

  // Map to frontend shape
  const mappedJobs = jobs.map(j => {
    const matchingDoc = docs.find(d => d._id.equals(j.documentId));
    
    // Map status string to stage enum format
    let stage = 'queued';
    if (j.status === 'OCR') stage = 'ocr';
    else if (j.status === 'Translating') stage = 'translate';
    else if (j.status === 'Extracting') stage = 'extract';
    else if (j.status === 'Embedding') stage = 'embed';
    else if (j.status === 'Complete') stage = 'done';
    else if (j.status === 'Failed') stage = 'failed';

    return {
      id: j._id,
      documentId: j.documentId,
      name: matchingDoc ? matchingDoc.name : 'Unknown File',
      pages: matchingDoc ? matchingDoc.pages : 1,
      size: matchingDoc ? (matchingDoc.size > 1024 * 1024 ? `${(matchingDoc.size / (1024 * 1024)).toFixed(1)} MB` : `${(matchingDoc.size / 1024).toFixed(0)} KB`) : '0 KB',
      stage,
      progress: j.progress,
      startedAt: new Date(j.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      error: j.error
    };
  });

  sendSuccess(res, 200, { jobs: mappedJobs });
});

/**
 * @desc    Retry a failed background job
 * @route   POST /api/documents/jobs/:id/retry
 * @access  Private
 */
export const retryJob = catchAsync(async (req, res, next) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    return next(new AppError('Job record not found', 404));
  }

  const document = await Document.findById(job.documentId);
  if (!document) {
    return next(new AppError('Matching document not found', 404));
  }

  // Reset Job status
  job.status = 'Queued';
  job.progress = 0;
  job.error = undefined;
  job.steps = job.steps.map(s => ({
    ...s,
    status: s.name === 'Translate' && !document.translatedText ? 'pending' : 'done'
  }));
  
  // Set first step (OCR) back to pending
  if (job.steps[0]) job.steps[0].status = 'pending';
  await job.save();

  // Reset Document status
  document.status = 'Processing';
  await document.save();

  // Re-trigger FastAPI pipeline
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const triggerPayload = {
    document_id: document._id.toString(),
    file_url: document.fileUrl,
    ocr: true,
    translate: !!document.translatedText,
    target_lang: 'en',
    extract: true
  };

  fetch(`${AI_SERVICE_URL}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(triggerPayload)
  }).catch(err => console.error('Failed to trigger AI on retry:', err.message));

  sendSuccess(res, 200, { job }, 'Job successfully queued for reprocessing');
});

