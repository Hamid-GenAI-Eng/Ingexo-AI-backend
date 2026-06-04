import express from 'express';
import authRouter from './auth.routes.js';
import documentsRouter from '../modules/documents/doc.routes.js';
import sharingRouter from '../modules/sharing/share.routes.js';
import workspaceRouter from '../modules/workspace/team.routes.js';
import timelineRouter from '../modules/timeline/timeline.routes.js';
import chatRouter from '../modules/chat/chat.routes.js';

const router = express.Router();

// Mount auth sub-routes under /auth
router.use('/auth', authRouter);

// Mount documents sub-routes under /documents
router.use('/documents', documentsRouter);

// Mount sharing sub-routes under /shares
router.use('/shares', sharingRouter);

// Mount workspace sub-routes under /workspace
router.use('/workspace', workspaceRouter);

// Mount timeline sub-routes under /timeline
router.use('/timeline', timelineRouter);

// Mount chat / conversation sub-routes under /chat
router.use('/chat', chatRouter);


// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Ingexo AI Backend API is healthy and operational',
    timestamp: new Date(),
    cloudinaryConfig: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? process.env.CLOUDINARY_CLOUD_NAME.substring(0, 3) + '...' : 'undefined',
      apiKey: process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.substring(0, 4) + '...' : 'undefined',
      hasSecret: !!process.env.CLOUDINARY_API_SECRET,
      nodeEnv: process.env.NODE_ENV
    }
  });
});


export default router;
