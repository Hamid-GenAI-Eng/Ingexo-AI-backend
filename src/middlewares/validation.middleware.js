import AppError from '../utils/AppError.js';

/**
 * Validation Middleware for Signup Requests
 */
export const validateSignup = (req, res, next) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !fullName.trim()) {
    return next(new AppError('Full name is required', 400));
  }

  if (!email || !email.trim()) {
    return next(new AppError('Email address is required', 400));
  }

  // Simple email regex validation
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Please provide a valid email address', 400));
  }

  if (!password || password.length < 8) {
    return next(new AppError('Password must be at least 8 characters long', 400));
  }

  next();
};

/**
 * Validation Middleware for Login Requests
 */
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    return next(new AppError('Email address is required', 400));
  }

  if (!password) {
    return next(new AppError('Password is required', 400));
  }

  next();
};

/**
 * Validation Middleware for Google Authentication
 */
export const validateGoogleAuth = (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken) {
    return next(new AppError('Google ID token is required', 400));
  }

  next();
};

/**
 * Validation Middleware for Forgot Password Requests
 */
export const validateForgotPassword = (req, res, next) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return next(new AppError('Email address is required', 400));
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Please provide a valid email address', 400));
  }

  next();
};

/**
 * Validation Middleware for Verify OTP Requests
 */
export const validateVerifyOtp = (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !email.trim()) {
    return next(new AppError('Email address is required', 400));
  }

  if (!otp || otp.trim().length !== 6) {
    return next(new AppError('OTP must be a 6-digit code', 400));
  }

  next();
};

/**
 * Validation Middleware for Reset Password Requests
 */
export const validateResetPassword = (req, res, next) => {
  const { email, otp, password } = req.body;

  if (!email || !email.trim()) {
    return next(new AppError('Email address is required', 400));
  }

  if (!otp || otp.trim().length !== 6) {
    return next(new AppError('OTP must be a 6-digit code', 400));
  }

  if (!password || password.length < 8) {
    return next(new AppError('Password must be at least 8 characters long', 400));
  }

  next();
};
