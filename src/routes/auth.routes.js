import express from 'express';
import { signup, login, googleAuth, logout, getMe, forgotPassword, verifyOtp, resetPassword } from '../controllers/auth.controller.js';
import { validateSignup, validateLogin, validateGoogleAuth, validateForgotPassword, validateVerifyOtp, validateResetPassword } from '../middlewares/validation.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public Routes
router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.post('/google', validateGoogleAuth, googleAuth);
router.post('/logout', logout);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/verify-otp', validateVerifyOtp, verifyOtp);
router.post('/reset-password', validateResetPassword, resetPassword);

// Protected Private Routes
router.get('/me', protect, getMe);

export default router;
