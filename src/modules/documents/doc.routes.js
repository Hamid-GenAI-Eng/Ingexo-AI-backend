import express from 'express';
import multer from 'multer';
import {
  uploadDocument,
  getDocuments,
  getDocumentDetails,
  updateDoc,
  deleteDoc,
  webhookCallback,
  getJobs,
  retryJob
} from './doc.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// 1. Configure Multer in-memory storage (prevents server temp disk file leak)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Validate acceptable document MIME types
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/heic', 'image/tiff'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and image uploads (PNG, JPEG, HEIC, TIFF) are supported.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB maximum payload matched to frontend scope
  }
});

// 2. Webhook Callback (Public Endpoint for FastAPI Python Microservice)
router.post('/webhook-callback', webhookCallback);

// 3. User Protected Routes
router.use(protect); // Secure all endpoints below with JWT validation

router.post('/', upload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.get('/jobs/queue', getJobs);
router.post('/jobs/:id/retry', retryJob);
router.get('/:id', getDocumentDetails);
router.patch('/:id', updateDoc);
router.delete('/:id', deleteDoc);


export default router;
