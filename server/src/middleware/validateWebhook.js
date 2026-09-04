import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Computes an HMAC-SHA256 signature for a payload using the provided secret.
 * @param {string|object} payload
 * @param {string} secret
 * @returns {string} Hex encoded HMAC signature
 */
export function computeRazorpaySignature(payload, secret) {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(content).digest('hex');
}

/**
 * Webhook Validation Middleware
 *
 * For real Razorpay webhooks: cryptographically validates X-Razorpay-Signature
 * before validating required JSON payload shape.
 *
 * For simulator payloads: performs structural payload validation.
 *
 * @param {'simulator'|'razorpay_test'|'razorpay'} source
 */
export function validateWebhook(source) {
  return (req, res, next) => {
    const body = req.body;

    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        error: true,
        message: 'Request body must be a valid JSON object',
        code: 'INVALID_PAYLOAD',
        details: { fields: [{ field: 'body', message: 'Request body must be a JSON object' }] },
      });
    }

    // 1. Cryptographic HMAC Signature check for real Razorpay routes
    if (source !== 'simulator') {
      const signature = req.headers['x-razorpay-signature'];
      const secret = env.RAZORPAY_WEBHOOK_SECRET || 'sample_webhook_secret_key_12345';

      if (!signature) {
        return res.status(401).json({
          error: true,
          message: 'Missing webhook signature header (X-Razorpay-Signature)',
          code: 'INVALID_SIGNATURE',
          details: { header: 'x-razorpay-signature' },
        });
      }

      const payloadString = req.rawBody || JSON.stringify(body);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

      const sigBuf = Buffer.from(signature, 'utf8');
      const expBuf = Buffer.from(expectedSignature, 'utf8');

      const isValid =
        sigBuf.length === expBuf.length &&
        crypto.timingSafeEqual(sigBuf, expBuf);

      if (!isValid) {
        return res.status(401).json({
          error: true,
          message: 'Invalid webhook signature',
          code: 'INVALID_SIGNATURE',
          details: { header: 'x-razorpay-signature' },
        });
      }
    }

    // 2. Payload Shape Validation
    const errors = [];
    if (source === 'simulator') {
      validateSimulatorPayload(body, errors);
    } else {
      validateRazorpayPayload(body, errors);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: true,
        message: 'Validation failed: missing or invalid required fields',
        code: 'INVALID_PAYLOAD',
        details: { fields: errors },
        // Preserving fields array at root for compatibility with tests expecting root fields property
        fields: errors,
      });
    }

    next();
  };
}

function validateSimulatorPayload(body, errors) {
  if (!body.id) {
    errors.push({ field: 'id', message: 'Event id is required' });
  }

  if (!body.event) {
    errors.push({ field: 'event', message: 'Event type (e.g. "payment.failed") is required' });
  }

  if (!body.payload) {
    errors.push({ field: 'payload', message: 'Payload object is required' });
  } else if (!body.payload.payment) {
    errors.push({ field: 'payload.payment', message: 'Payment object is required in payload' });
  } else if (!body.payload.payment.id) {
    errors.push({ field: 'payload.payment.id', message: 'Payment id is required' });
  }
}

function validateRazorpayPayload(body, errors) {
  // Razorpay sends: { event: "...", payload: { payment: { entity: { id: "..." } } } }
  if (!body.event) {
    errors.push({ field: 'event', message: 'Event type is required' });
  }

  if (!body.payload) {
    errors.push({ field: 'payload', message: 'Payload object is required' });
  } else if (!body.payload.payment) {
    errors.push({ field: 'payload.payment', message: 'Payment object is required in payload' });
  } else if (!body.payload.payment.entity) {
    errors.push({ field: 'payload.payment.entity', message: 'Payment entity is required' });
  } else if (!body.payload.payment.entity.id) {
    errors.push({ field: 'payload.payment.entity.id', message: 'Payment entity id is required' });
  }
}

