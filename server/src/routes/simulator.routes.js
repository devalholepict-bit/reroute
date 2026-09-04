import { Router } from 'express';
import {
  createSimulatorEvents,
  createSimulatorEventsWithPayload,
  runDemoBatch,
} from '../controllers/simulator.controller.js';
import { devAuthGuard } from '../middleware/devAuthGuard.js';

const router = Router();

// POST /api/simulator/run — generates demo batch (5 cases across distinct causes)
router.post('/run', devAuthGuard, runDemoBatch);

// POST /api/simulator/events — returns { created: [...eventIds] }
router.post('/events', devAuthGuard, createSimulatorEvents);

// POST /api/simulator/events/full — returns { created: [...eventIds], events: [...] }
// Used by the UI to display raw JSON
router.post('/events/full', devAuthGuard, createSimulatorEventsWithPayload);

export default router;


