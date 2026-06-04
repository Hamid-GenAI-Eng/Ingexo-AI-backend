import crypto from 'crypto';
import Share from './share.model.js';
import Document from '../documents/doc.model.js';
import AppError from '../../utils/AppError.js';

/**
 * Create a new secure sharing policy for a document
 */
export const createSharePolicy = async ({
  documentId,
  userId,
  allowedFields,
  password,
  expiresAt
}) => {
  // 1. Verify document ownership
  const document = await Document.findOne({ _id: documentId, ownerId: userId });
  if (!document) {
    throw new AppError('Document not found or unauthorized access', 404);
  }

  // 2. Generate secure unguessable unique token URL hash
  const token = crypto.randomUUID();

  // 3. Create sharing policy in MongoDB Atlas
  const share = await Share.create({
    documentId,
    userId,
    token,
    password: password || undefined,
    expiresAt: expiresAt || undefined,
    allowedFields: allowedFields || []
  });

  // Hide password hash from return payload
  share.password = undefined;
  return share;
};

/**
 * Fetch and authorize public shared document access with granular fields masking
 */
export const getSharedDocumentByToken = async (token, candidatePassword = null) => {
  // 1. Fetch policy and explicitly select password hash
  const share = await Share.findOne({ token }).select('+password');
  
  if (!share) {
    throw new AppError('The share link is invalid or has been revoked', 404);
  }

  // 2. Check policy expiration date
  if (share.expiresAt && new Date() > share.expiresAt) {
    throw new AppError('The share link has expired', 410); // Gone status code
  }

  // 3. Verify Password Protection (Security Guard)
  if (share.password) {
    if (!candidatePassword) {
      throw new AppError('This secure document is password-protected. Please enter a password.', 401);
    }

    const isMatch = await share.comparePassword(candidatePassword);
    if (!isMatch) {
      throw new AppError('Incorrect password. Access denied.', 403);
    }
  }

  // 4. Fetch associated Document
  const document = await Document.findById(share.documentId);
  if (!document) {
    throw new AppError('The shared document no longer exists', 404);
  }

  // 5. Apply Granular Field-Level Masking (The Core RLS Security Layer)
  const docObj = document.toObject();
  
  // Clean up MongoDB internals
  delete docObj.ownerId;
  delete docObj.__v;

  const originalExtractedFields = docObj.extractedFields || {};
  const maskedExtractedFields = {};

  // Strip/Filter JSON keys, preserving only the fields whitelisted in allowedFields policy
  share.allowedFields.forEach((fieldKey) => {
    if (originalExtractedFields[fieldKey] !== undefined) {
      maskedExtractedFields[fieldKey] = originalExtractedFields[fieldKey];
    }
  });

  docObj.extractedFields = maskedExtractedFields;

  // Mask text layers if they are not explicitly allowed in fields config (security by default!)
  if (!share.allowedFields.includes('originalText')) {
    delete docObj.originalText;
  }
  if (!share.allowedFields.includes('translatedText')) {
    delete docObj.translatedText;
  }
  if (!share.allowedFields.includes('summary')) {
    delete docObj.summary;
  }

  return {
    document: docObj,
    policy: {
      token: share.token,
      expiresAt: share.expiresAt,
      allowedFields: share.allowedFields,
      isPasswordProtected: !!share.password
    }
  };
};

/**
 * Delete / revoke sharing policy
 */
export const revokeSharePolicy = async (shareId, userId) => {
  const share = await Share.findOneAndDelete({ _id: shareId, userId });
  if (!share) {
    throw new AppError('Share policy not found or unauthorized access', 404);
  }
  return share;
};

/**
 * Retrieve all active share policies configured by the user
 */
export const getUserSharePolicies = async (userId) => {
  const shares = await Share.find({ userId })
    .select('+password')
    .populate('documentId', 'name type status')
    .sort({ createdAt: -1 });

  return shares.map(s => {
    const obj = s.toObject();
    obj.hasPassword = !!s.password;
    delete obj.password; // Make sure the hash is never returned
    return obj;
  });
};
