import {
  createSharePolicy,
  getSharedDocumentByToken,
  revokeSharePolicy,
  getUserSharePolicies
} from './share.service.js';
import { sendSuccess } from '../../utils/responseHandler.js';
import AppError from '../../utils/AppError.js';

const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

/**
 * @desc    Configure and create a new secure document share policy
 * @route   POST /api/shares
 * @access  Private (Guarded by auth.protect)
 */
export const createShare = catchAsync(async (req, res, next) => {
  const { documentId, allowedFields, password, expiresAt } = req.body;

  if (!documentId) {
    return next(new AppError('Please specify the target document ID to share', 400));
  }

  const share = await createSharePolicy({
    documentId,
    userId: req.user._id,
    allowedFields,
    password,
    expiresAt
  });

  sendSuccess(res, 201, { share }, 'Secure shareable policy created successfully');
});

/**
 * @desc    Access a shared document publicly using the secure token URL
 * @route   POST /api/shares/public/:token
 * @route   GET /api/shares/public/:token
 * @access  Public
 */
export const getPublicShare = catchAsync(async (req, res, next) => {
  // Support password inputs in either JSON POST request body or GET query parameters
  const candidatePassword = req.body.password || req.query.password || null;

  const result = await getSharedDocumentByToken(req.params.token, candidatePassword);

  sendSuccess(res, 200, result, 'Shared document retrieved successfully');
});

/**
 * @desc    Get all active share policies created by the user
 * @route   GET /api/shares
 * @access  Private
 */
export const getShares = catchAsync(async (req, res, next) => {
  const shares = await getUserSharePolicies(req.user._id);
  sendSuccess(res, 200, { shares });
});

/**
 * @desc    Revoke and delete a secure share policy
 * @route   DELETE /api/shares/:id
 * @access  Private
 */
export const deleteShare = catchAsync(async (req, res, next) => {
  await revokeSharePolicy(req.params.id, req.user._id);
  sendSuccess(res, 200, { shareId: req.params.id }, 'Sharing link successfully revoked');
});
