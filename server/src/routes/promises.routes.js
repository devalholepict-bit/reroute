import { Router } from 'express';
import {
  advancePromiseTime,
  listPromises,
} from '../controllers/promises.controller.js';
import { devAuthGuard } from '../middleware/devAuthGuard.js';

const router = Router();

// GET /api/promises — list all promises
router.get('/', listPromises);

// POST /api/promises/advance-time — resolve pending promise on demand
router.post('/advance-time', devAuthGuard, advancePromiseTime);

export default router;

