import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { setupTestDB, clearTestDB, teardownTestDB } from './dbHelper.js';

describe('Integration: Simulator & Admin Access Control (Task 3)', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('POST /api/simulator/events without X-Dev-Secret returns 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .post('/api/simulator/events')
      .send({ cause: 'otp_timeout' })
      .expect(401);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/simulator/events with invalid X-Dev-Secret returns 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .post('/api/simulator/events')
      .set('x-dev-secret', 'wrong_token_here')
      .send({ cause: 'otp_timeout' })
      .expect(401);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/simulator/events/full without X-Dev-Secret returns 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .post('/api/simulator/events/full')
      .send({ cause: 'otp_timeout', count: 1 })
      .expect(401);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/simulator/run without X-Dev-Secret returns 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .post('/api/simulator/run')
      .send({})
      .expect(401);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/promises/advance-time without X-Dev-Secret returns 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .post('/api/promises/advance-time')
      .send({ caseId: 'evt_test_123' })
      .expect(401);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/promises/advance-time with invalid X-Dev-Secret returns 401 UNAUTHORIZED', async () => {
    const res = await request(app)
      .post('/api/promises/advance-time')
      .set('x-dev-secret', 'invalid_secret')
      .send({ caseId: 'evt_test_123' })
      .expect(401);

    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/simulator/events with valid X-Dev-Secret passes through and succeeds', async () => {
    const res = await request(app)
      .post('/api/simulator/events')
      .set('x-dev-secret', env.SIMULATOR_DEV_SECRET)
      .send({ cause: 'otp_timeout' })
      .expect(200);

    expect(res.body.created).toHaveLength(1);
  });
});
