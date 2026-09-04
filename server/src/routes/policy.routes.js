import { Router } from 'express';
import { getPolicies } from '../controllers/policy.controller.js';

const router = Router();

// GET /api/policies — returns current policy table
router.get('/', getPolicies);

export default router;
