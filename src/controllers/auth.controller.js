import { registerUser, loginUser, verifyGoogleIdToken } from '../services/auth.service.js';
import { sendTokenResponse } from '../utils/token.js';
import { sendSuccess } from '../utils/responseHandler.js';

/**
 * Async Error Handling Wrapper
 * Eliminates repetitive try-catch blocks in controller routes
 */
const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

/**
 * @desc    Register a new local user
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const signup = catchAsync(async (req, res, next) => {
  const { fullName, email, password } = req.body;

  const newUser = await registerUser(fullName, email, password);

  // Return token response (Sets HttpOnly Cookie + JSON payload token)
  sendTokenResponse(newUser, 201, res);
});

/**
 * @desc    Local authentication sign-in
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await loginUser(email, password);

  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Google Sign-in / Sign-up credential OIDC processing
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleAuth = catchAsync(async (req, res, next) => {
  const { idToken } = req.body;

  const user = await verifyGoogleIdToken(idToken);

  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Logout User / Clear Authentication Cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logout = catchAsync(async (req, res, next) => {
  // Clear the auth cookie on client browser
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 5000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });

  sendSuccess(res, 200, {}, 'Successfully logged out');
});

/**
 * @desc    Get Current Authenticated User profile details
 * @route   GET /api/auth/me
 * @access  Private (Guarded by auth.middleware.js)
 */
export const getMe = catchAsync(async (req, res, next) => {
  // The current active user is already attached to req by the auth middleware
  const user = req.user;
  sendSuccess(res, 200, { user });
});
