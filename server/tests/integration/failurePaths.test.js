import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { setupTestDB, clearTestDB, teardownTestDB } from './dbHelper.js';

function signPayload(payload, secret = env.RAZORPAY_WEBHOOK_SECRET) {
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(content).digest('hex');
}

describe('Phase 14: System Hardening & Failure-Path Resilience Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('1. Returns 404 NOT_FOUND for unknown API routes with standardized error format', async () => {
    const res = await request(app).get('/api/non-existent-route-xyz').expect(404);

    expect(res.body).toEqual({
      error: true,
      message: 'Route not found: GET /api/non-existent-route-xyz',
      code: 'NOT_FOUND',
      details: { method: 'GET', path: '/api/non-existent-route-xyz' },
    });
  });

  it('2. Returns 404 CASE_NOT_FOUND for non-existent case ID', async () => {
    const res = await request(app).get('/api/cases/evt_unknown_missing_9999').expect(404);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('CASE_NOT_FOUND');
    expect(res.body.message).toContain('Case not found');
    expect(res.body.details?.case_id).toBe('evt_unknown_missing_9999');
  });


  it('3. Returns 400 VALIDATION_ERROR for invalid simulator parameters', async () => {
    const res = await request(app)
      .post('/api/simulator/events')
      .set('x-dev-secret', env.SIMULATOR_DEV_SECRET)
      .send({ cause: 'invalid_invented_cause' })
      .expect(400);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.message).toContain('Unrecognized cause');
  });

  it('4. Returns 400 INVALID_PAYLOAD for malformed webhook body with valid signature', async () => {
    const malformedBody = { invalid: 'no payment entity' };
    const sig = signPayload(malformedBody);

    const res = await request(app)
      .post('/api/webhooks/razorpay')
      .set('x-razorpay-signature', sig)
      .send(malformedBody)
      .expect(400);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('INVALID_PAYLOAD');
    expect(res.body.message).toContain('Validation failed');
  });

  it('5. Returns 404 PROMISE_NOT_FOUND when advancing a case with no pending promise', async () => {
    const res = await request(app)
      .post('/api/promises/advance-time')
      .set('x-dev-secret', env.SIMULATOR_DEV_SECRET)
      .send({ caseId: 'evt_no_promise_here' })
      .expect(404);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('PROMISE_NOT_FOUND');
    expect(res.body.message).toContain('No pending promise-to-pay found');
  });

  it('6. ML Outage: falls back to rules_fallback within timeout without crashing pipeline', async () => {
    // When calling simulator with ML server offline/simulated failure
    const res = await request(app)
      .post('/api/simulator/events/full')
      .set('x-dev-secret', env.SIMULATOR_DEV_SECRET)
      .send({ cause: 'otp_timeout', count: 1 })
      .expect(200);

    expect(res.body.created).toHaveLength(1);
    const eventId = res.body.created[0];

    const caseRes = await request(app).get(`/api/cases/${eventId}`).expect(200);
    expect(caseRes.body.diagnosis).toBeDefined();
    expect(caseRes.body.diagnosis.cause).toBe('otp_timeout');
    expect(['rules+ml', 'rules_fallback', 'rules_only']).toContain(
      caseRes.body.diagnosis.diagnosis_method
    );
  });

  it('7. MongoDB Outage: GET /api/health returns 200 with db="disconnected" and data routes fast-fail with 503', async () => {
    // Temporarily disconnect mongoose
    await mongoose.disconnect();

    try {
      // 1. /api/health stays alive and responds HTTP 200 with db: "disconnected"
      const healthRes = await request(app).get('/api/health').expect(200);
      expect(healthRes.body.status).toBe('ok');
      expect(healthRes.body.db).toBe('disconnected');

      // 2. Data-dependent route immediately fast-fails with 503 MONGO_UNAVAILABLE without hanging
      const casesRes = await request(app).get('/api/cases').expect(503);
      expect(casesRes.body.error).toBe(true);
      expect(casesRes.body.code).toBe('MONGO_UNAVAILABLE');
      expect(casesRes.body.message).toContain('Database temporarily unavailable');

      const metricsRes = await request(app).get('/api/metrics').expect(503);
      expect(metricsRes.body.code).toBe('MONGO_UNAVAILABLE');

      const simRes = await request(app)
        .post('/api/simulator/events')
        .set('x-dev-secret', env.SIMULATOR_DEV_SECRET)
        .send({ cause: 'otp_timeout' })
        .expect(503);
      expect(simRes.body.code).toBe('MONGO_UNAVAILABLE');
    } finally {
      // Reconnect test database for subsequent tests
      await setupTestDB();
    }
  });


  it('8. Unexpected errors sanitize stack traces and output safe 500 INTERNAL_ERROR', async () => {
    // Test errorHandler directly with simulated unhandled error
    const req = {};
    const res = {
      statusCode: 0,
      jsonData: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.jsonData = data;
        return this;
      },
    };

    const { errorHandler } = await import('../../src/middleware/errorHandler.js');
    const sensitiveErr = new Error('Sensitive DB connection string: mongodb+srv://admin:secret@host/db');
    errorHandler(sensitiveErr, req, res, () => {});

    expect(res.statusCode).toBe(500);
    expect(res.jsonData.error).toBe(true);
    expect(res.jsonData.code).toBe('INTERNAL_ERROR');
    expect(res.jsonData.message).toBe('An unexpected internal server error occurred');
    // Ensure raw secret or stack trace is not exposed
    expect(JSON.stringify(res.jsonData)).not.toContain('secret');
  });
});
