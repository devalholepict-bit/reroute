import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import Event from '../../src/models/Event.model.js';
import Diagnosis from '../../src/models/Diagnosis.model.js';
import RecoveryAction from '../../src/models/RecoveryAction.model.js';
import Outcome from '../../src/models/Outcome.model.js';
import { setupTestDB, clearTestDB, teardownTestDB } from './dbHelper.js';

describe('Integration: Full Single-Case Pipeline Flow', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('runs complete lifecycle: normalization -> diagnosis -> policy -> execution -> outcome referencing event_id', async () => {
    // Trigger one simulator event with forced_outcome for deterministic testing
    const res = await request(app)
      .post('/api/simulator/events/full')
      .set('x-dev-secret', env.SIMULATOR_DEV_SECRET)
      .send({ cause: 'otp_timeout', count: 1 })
      .expect(200);


    expect(res.body.created).toHaveLength(1);
    const eventId = res.body.created[0];

    // 1. Verify Event document
    const eventDoc = await Event.findOne({ id: eventId }).lean();
    expect(eventDoc).toBeDefined();
    expect(eventDoc.source).toBe('simulator');
    expect(eventDoc.payload.payment.error_reason).toBe('otp_timeout');
    // For otp_timeout, outcome is terminal (paid_immediately), so status resolves to 'resolved'
    expect(eventDoc.status).toBe('resolved');

    // 2. Verify Diagnosis document exists and references event_id
    const diagDoc = await Diagnosis.findOne({ event_id: eventId }).lean();
    expect(diagDoc).toBeDefined();
    expect(diagDoc.cause).toBe('otp_timeout');
    expect(diagDoc.diagnosis_method).toBeDefined();

    // 3. Verify RecoveryAction document exists, references event_id, and is executed
    const raDoc = await RecoveryAction.findOne({ event_id: eventId }).lean();
    expect(raDoc).toBeDefined();
    expect(raDoc.action).toBe('send_retry_link');
    expect(raDoc.channel).toBe('retry_link');
    expect(raDoc.status).toBe('executed');
    expect(raDoc.message_sent).toContain('OTP');

    // 4. Verify Outcome document exists and correctly links to recovery_action_id and event_id
    const outcomeDoc = await Outcome.findOne({ event_id: eventId }).lean();
    expect(outcomeDoc).toBeDefined();
    expect(outcomeDoc.recovery_action_id.toString()).toBe(raDoc._id.toString());
    expect(outcomeDoc.event_id).toBe(eventId);
    expect(outcomeDoc.outcome).toBeDefined();

    // 5. Query /api/cases/:id and verify full graph is assembled
    const caseRes = await request(app).get(`/api/cases/${eventId}`).expect(200);
    expect(caseRes.body.id).toBe(eventId);
    expect(caseRes.body.diagnosis.cause).toBe('otp_timeout');
    expect(caseRes.body.recovery_actions[0].action).toBe('send_retry_link');
    expect(caseRes.body.outcomes[0].recovery_action_id).toBe(raDoc._id.toString());
  });
});
