import { registerUser, loginUser, verifyGoogleIdToken, requestForgotPasswordOtp, verifyOtpCode, resetUserPassword } from '../services/auth.service.js';
import { sendEmail } from '../utils/mailer.js';
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

/**
 * @desc    Request Password Reset OTP
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  
  const otp = await requestForgotPasswordOtp(email);

  // Send Email with OTP
  const message = `Hello,\n\nYou requested a password reset. Your verification code is: ${otp}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
      <h2 style="color: #6366f1;">Ingexo AI Password Recovery</h2>
      <p>Hello,</p>
      <p>You requested a password reset. Please use the following 6-digit verification code to proceed:</p>
      <div style="font-size: 24px; font-weight: bold; background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; letter-spacing: 5px; color: #0f172a; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in <strong>15 minutes</strong>.</p>
      <p>If you did not request this password reset, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b;">This email was sent automatically by Ingexo AI.</p>
    </div>
  `;

  await sendEmail({
    email,
    subject: 'Ingexo AI - Password Reset Code',
    message,
    html
  });

  sendSuccess(res, 200, { email }, 'Verification OTP code sent to your email address');
});

/**
 * @desc    Verify Password Reset OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  await verifyOtpCode(email, otp);

  sendSuccess(res, 200, { email, otp, verified: true }, 'Verification code successfully validated');
});

/**
 * @desc    Reset password using OTP
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = catchAsync(async (req, res, next) => {
  const { email, otp, password } = req.body;

  await resetUserPassword(email, otp, password);

  sendSuccess(res, 200, {}, 'Password successfully updated');
});
