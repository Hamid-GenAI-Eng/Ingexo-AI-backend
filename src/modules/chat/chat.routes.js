import express from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import {
  getThreads,
  createThread,
  getThreadDetails,
  postMessage,
  deleteThread
} from './chat.controller.js';

const router = express.Router();

// Secure all conversation / chat endpoints with JWT Auth
router.use(protect);

router.route('/threads')
  .get(getThreads)
  .post(createThread);

router.route('/threads/:id')
  .get(getThreadDetails)
  .delete(deleteThread);

router.post('/threads/:id/messages', postMessage);

export default router;
