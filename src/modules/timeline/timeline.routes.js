import express from 'express';
import { getTeamTimeline } from './timeline.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Secure all endpoints below with JWT Auth validations
router.use(protect);

router.get('/', getTeamTimeline);

export default router;
