import Document from '../documents/doc.model.js';
import Job from '../documents/job.model.js';
import Share from '../sharing/share.model.js';
import User from '../../models/User.js';
import { sendSuccess } from '../../utils/responseHandler.js';
import AppError from '../../utils/AppError.js';

const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

/**
 * Helper to convert absolute Date to a readable relative Day or ISO string
 */
const formatEventDay = (dateObj) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const targetDate = new Date(dateObj);
  
  if (targetDate.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (targetDate.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    // Return Month Day format e.g. "Mar 22" or "Jun 01"
    return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

/**
 * Helper to convert Date to a readable time format e.g. "2:14 PM"
 */
const formatEventTime = (dateObj) => {
  return new Date(dateObj).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * @desc    Aggregate all document uploads, processing pipelines, and shares into a chronological workspace timeline feed
 * @route   GET /api/timeline
 * @access  Private (Guarded by auth.protect)
 */
export const getTeamTimeline = catchAsync(async (req, res, next) => {
  if (!req.user.workspaceId) {
    return next(new AppError('You do not belong to an active workspace', 400));
  }

  // 1. Locate all team members in the current active SaaS workspace
  const teamMembers = await User.find({ workspaceId: req.user.workspaceId }).select('_id');
  const memberIds = teamMembers.map(m => m._id);

  // 2. Fetch all Documents owned by these members
  const documents = await Document.find({ ownerId: { $in: memberIds } }).sort({ createdAt: -1 });
  const docIds = documents.map(d => d._id);

  // 3. Fetch corresponding Ingestion Jobs and active Shares
  const jobs = await Job.find({ documentId: { $in: docIds } });
  const shares = await Share.find({ documentId: { $in: docIds } });

  const events = [];

  // Map Documents into Upload Events
  documents.forEach((doc) => {
    events.push({
      id: `upload_${doc._id}`,
      day: formatEventDay(doc.createdAt),
      time: formatEventTime(doc.createdAt),
      kind: 'upload',
      title: 'Uploaded document',
      doc: doc.name,
      detail: `${doc.pages} page${doc.pages === 1 ? '' : 's'} · ${(doc.size / (1024 * 1024)).toFixed(1)} MB`,
      timestamp: new Date(doc.createdAt).getTime()
    });
  });

  // Map Jobs steps into processing stage events (OCR, Translation, Extraction, Embeddings, Errors)
  jobs.forEach((job) => {
    // Find matching document name for context
    const matchingDoc = documents.find(d => d._id.equals(job.documentId));
    const docName = matchingDoc ? matchingDoc.name : 'Unknown File';

    // Map pipeline errors
    if (job.status === 'Failed' && job.error) {
      events.push({
        id: `error_${job._id}`,
        day: formatEventDay(job.updatedAt),
        time: formatEventTime(job.updatedAt),
        kind: 'error',
        title: 'Ingestion pipeline failed',
        doc: docName,
        detail: job.error,
        timestamp: new Date(job.updatedAt).getTime()
      });
    }

    // Map completed OCR step
    const ocrStep = job.steps.find(s => s.name === 'OCR');
    if (ocrStep && ocrStep.status === 'done') {
      events.push({
        id: `ocr_${job._id}`,
        day: formatEventDay(job.updatedAt), // approximated to job updates time
        time: formatEventTime(job.updatedAt),
        kind: 'ocr',
        title: 'OCR text recognition completed',
        doc: docName,
        detail: 'Text layout preserved',
        timestamp: new Date(job.updatedAt).getTime() - 1000 // offset slightly for ordering
      });
    }

    // Map completed Translation step
    const transStep = job.steps.find(s => s.name === 'Translate');
    if (transStep && transStep.status === 'done' && matchingDoc?.translatedText) {
      events.push({
        id: `translate_${job._id}`,
        day: formatEventDay(job.updatedAt),
        time: formatEventTime(job.updatedAt),
        kind: 'translate',
        title: `Translated successfully`,
        doc: docName,
        detail: `Auto-translation layer generated`,
        timestamp: new Date(job.updatedAt).getTime() - 2000
      });
    }

    // Map completed JSON structured extraction
    const extractStep = job.steps.find(s => s.name === 'Extract');
    if (extractStep && extractStep.status === 'done') {
      const keysCount = matchingDoc?.extractedFields ? Object.keys(matchingDoc.extractedFields).length : 0;
      events.push({
        id: `extract_${job._id}`,
        day: formatEventDay(job.updatedAt),
        time: formatEventTime(job.updatedAt),
        kind: 'extract',
        title: `Extracted structured properties`,
        doc: docName,
        detail: `Parsed ${keysCount} key database fields`,
        timestamp: new Date(job.updatedAt).getTime() - 3000
      });
    }

    // Map completed embeddings generation step
    const embedStep = job.steps.find(s => s.name === 'Embed');
    if (embedStep && embedStep.status === 'done') {
      events.push({
        id: `embed_${job._id}`,
        day: formatEventDay(job.updatedAt),
        time: formatEventTime(job.updatedAt),
        kind: 'embed',
        title: 'Vector embeddings generated',
        doc: docName,
        detail: 'Indexed inside Pinecone DB',
        timestamp: new Date(job.updatedAt).getTime() - 4000
      });
    }
  });

  // Map Shares into Link Events
  shares.forEach((share) => {
    const matchingDoc = documents.find(d => d._id.equals(share.documentId));
    const docName = matchingDoc ? matchingDoc.name : 'Unknown File';

    events.push({
      id: `share_${share._id}`,
      day: formatEventDay(share.createdAt),
      time: formatEventTime(share.createdAt),
      kind: 'share',
      title: 'Created secure public link',
      doc: docName,
      detail: share.expiresAt ? `Expires on ${new Date(share.expiresAt).toLocaleDateString()}` : 'Indefinite link',
      timestamp: new Date(share.createdAt).getTime()
    });
  });

  // 4. Sort the unified feed chronologically (Newest first)
  events.sort((a, b) => b.timestamp - a.timestamp);

  // Return formatted array matching TanStack router schemas
  sendSuccess(res, 200, { events });
});
