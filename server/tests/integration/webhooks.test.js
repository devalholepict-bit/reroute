import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import Event from '../../src/models/Event.model.js';
import { setupTestDB, clearTestDB, teardownTestDB } from './dbHelper.js';

import crypto from 'crypto';
import { env } from '../../src/config/env.js';

function signPayload(payload, secret = env.RAZORPAY_WEBHOOK_SECRET) {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(content).digest('hex');
}

describe('Integration: Webhooks & Deduplication API', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('POST /api/webhooks/razorpay with missing signature header returns 401 and creates no document', async () => {
    const webhookPayload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_no_sig_123',
          },
        },
      },
    };

    const res = await request(app)
      .post('/api/webhooks/razorpay')
      .send(webhookPayload)
      .expect(401);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
    expect(res.body.message).toContain('Missing webhook signature');

    const count = await Event.countDocuments();
    expect(count).toBe(0);
  });

  it('POST /api/webhooks/razorpay with invalid signature returns 401 and creates no document', async () => {
    const webhookPayload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_bad_sig_123',
          },
        },
      },
    };

    const res = await request(app)
      .post('/api/webhooks/razorpay')
      .set('x-razorpay-signature', 'deliberately_invalid_hex_signature_abcdef1234567890')
      .send(webhookPayload)
      .expect(401);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
    expect(res.body.message).toContain('Invalid webhook signature');

    const count = await Event.countDocuments();
    expect(count).toBe(0);
  });

  it('POST /api/webhooks/razorpay with duplicate event ID results in a no-op 200 and exactly one document', async () => {
    const webhookPayload = {
      id: 'rzp_evt_dedup_test_999',
      event: 'payment.failed',
      created_at: 1700000000,
      payload: {
        payment: {
          entity: {
            id: 'pay_dedup_999',
            order_id: 'order_dedup_999',
            amount: 149900,
            currency: 'INR',
            method: 'card',
            status: 'failed',
            error_reason: 'card_expired',
          },
        },
      },
    };

    const sig = signPayload(webhookPayload);

    // 1st request -> success 200
    const res1 = await request(app)
      .post('/api/webhooks/razorpay')
      .set('x-razorpay-signature', sig)
      .send(webhookPayload)
      .expect(200);

    expect(res1.body).toEqual({ received: true });

    const docCountAfterFirst = await Event.countDocuments({ id: 'rzp_evt_dedup_test_999' });
    expect(docCountAfterFirst).toBe(1);

    // 2nd request with exact same event ID -> no-op 200 with duplicate flag
    const res2 = await request(app)
      .post('/api/webhooks/razorpay')
      .set('x-razorpay-signature', sig)
      .send(webhookPayload)
      .expect(200);

    expect(res2.body).toEqual({ received: true, duplicate: true });

    // Document count MUST remain exactly 1
    const docCountAfterSecond = await Event.countDocuments({ id: 'rzp_evt_dedup_test_999' });
    expect(docCountAfterSecond).toBe(1);
  });

  it('POST /api/webhooks/razorpay with malformed payload and valid signature returns 400 with field-level errors and creates no document', async () => {
    const malformedPayload = {
      event: 'payment.failed',
      payload: {
        payment: {
          // Missing entity.id
          entity: {
            amount: 149900,
          },
        },
      },
    };

    const sig = signPayload(malformedPayload);

    const res = await request(app)
      .post('/api/webhooks/razorpay')
      .set('x-razorpay-signature', sig)
      .send(malformedPayload)
      .expect(400);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('INVALID_PAYLOAD');
    expect(res.body.message).toContain('Validation failed');
    expect(res.body.details?.fields || res.body.fields).toBeDefined();
    const fields = res.body.details?.fields || res.body.fields;
    expect(
      fields.some((f) => f.field === 'payload.payment.entity.id')
    ).toBe(true);

    const docCount = await Event.countDocuments();
    expect(docCount).toBe(0);
  });

  it('POST /api/simulator/events without X-Dev-Secret returns 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .post('/api/simulator/events')
      .send({ cause: 'otp_timeout' })
      .expect(401);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/simulator/events with invalid cause and valid X-Dev-Secret returns 400 and creates no document', async () => {
    const res = await request(app)
      .post('/api/simulator/events')
      .set('x-dev-secret', env.SIMULATOR_DEV_SECRET)
      .send({ cause: 'non_existent_invalid_cause' })
      .expect(400);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.message).toContain('Unrecognized cause');

    const docCount = await Event.countDocuments();
    expect(docCount).toBe(0);
  });

});
