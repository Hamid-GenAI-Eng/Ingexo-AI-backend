import express from 'express';
import {
  createShare,
  getPublicShare,
  getShares,
  deleteShare
} from './share.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public Routes (Accessible by anonymous clients visiting shared URLs)
router.get('/public/:token', getPublicShare);
router.post('/public/:token', getPublicShare); // Supports password entry forms via POST

// Private Protected Routes (Secured via JWT Auth validation)
router.use(protect);

router.post('/', createShare);
router.get('/', getShares);
router.delete('/:id', deleteShare);

export default router;
