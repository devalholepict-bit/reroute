import { Router } from 'express';
import { receiveRazorpayWebhook } from '../controllers/webhooks.controller.js';
import { validateWebhook } from '../middleware/validateWebhook.js';

const router = Router();

// POST /api/webhooks/razorpay — validates then processes real Razorpay test-mode events
router.post('/razorpay', validateWebhook('razorpay_test'), receiveRazorpayWebhook);

export default router;

