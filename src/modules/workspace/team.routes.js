import express from 'express';
import {
  getTeam,
  sendInvite,
  joinWorkspace,
  updateRole,
  kickMember
} from './team.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Secure all endpoints below with JWT Auth validations
router.use(protect);

router.get('/team', getTeam);
router.post('/invite', sendInvite);
router.post('/invite/accept/:token', joinWorkspace);
router.patch('/team/:memberId', updateRole);
router.delete('/team/:memberId', kickMember);

export default router;
