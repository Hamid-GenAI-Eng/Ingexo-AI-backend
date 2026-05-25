import express from 'express';
import { signup, login, googleAuth, logout, getMe } from '../controllers/auth.controller.js';
import { validateSignup, validateLogin, validateGoogleAuth } from '../middlewares/validation.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public Routes
router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.post('/google', validateGoogleAuth, googleAuth);
router.post('/logout', logout);

// Protected Private Routes
router.get('/me', protect, getMe);

export default router;
