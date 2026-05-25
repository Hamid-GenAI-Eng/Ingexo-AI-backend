import express from 'express';
import authRouter from './auth.routes.js';

const router = express.Router();

// Mount auth sub-routes under /auth
router.use('/auth', authRouter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Ingexo AI Backend API is healthy and operational',
    timestamp: new Date()
  });
});

export default router;
