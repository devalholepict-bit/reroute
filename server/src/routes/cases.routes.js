import express from 'express';
import { listCases, getCaseById } from '../controllers/cases.controller.js';

const router = express.Router();

router.get('/', listCases);
router.get('/:id', getCaseById);

export default router;
