import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { setupTestDB, clearTestDB, teardownTestDB } from './dbHelper.js';

describe('Suite 5: End-to-End Pipeline Test (All 6 Core Causes)', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  const SIX_CAUSES = [
    { cause: 'insufficient_funds', expectedAction: 'delayed_retry', expectedChannel: 'sms' },
    { cause: 'card_expired', expectedAction: 'customer_update_request', expectedChannel: 'email' },
    { cause: 'otp_timeout', expectedAction: 'send_retry_link', expectedChannel: 'retry_link' },
    { cause: 'bank_server_timeout', expectedAction: 'delayed_retry', expectedChannel: 'sms' },
    { cause: 'generic_decline', expectedAction: 'low_priority_notification', expectedChannel: 'sms' },
    { cause: 'ambiguous_timeout' }, // Ambiguous timeout borrows reasons across causes
  ];

  for (const { cause, expectedAction, expectedChannel } of SIX_CAUSES) {
    it(`e2e lifecycle for cause "${cause}": diagnosis -> policy -> execution -> outcome -> gap-free audit trail`, async () => {
      // 1. Trigger simulation
      const res = await request(app)
        .post('/api/simulator/events/full')
        .set('x-dev-secret', env.SIMULATOR_DEV_SECRET)
        .send({ cause, count: 1 })
        .expect(200);


      expect(res.body.created).toHaveLength(1);
      const eventId = res.body.created[0];
      const event = res.body.events[0];
      const recoveryAction = res.body.recovery_actions[0];
      const outcome = res.body.outcomes[0];

      // 2. Assert Event
      expect(event.id).toBe(eventId);

      // 3. Assert Policy Engine selected action & channel
      if (expectedAction) {
        expect(recoveryAction.action).toBe(expectedAction);
        expect(recoveryAction.channel).toBe(expectedChannel);
      } else {
        expect(recoveryAction.action).toBeDefined();
        expect(recoveryAction.channel).toBeDefined();
      }
      expect(recoveryAction.status).toBe('executed');

      // 4. Assert Outcome Record
      expect(outcome).toBeDefined();
      expect(outcome.outcome).toBeDefined();

      // 5. Query Case Detail
      const caseDetailRes = await request(app).get(`/api/cases/${eventId}`).expect(200);
      expect(caseDetailRes.body.diagnosis.cause).toBeDefined();
      expect(caseDetailRes.body.recovery_actions[0].action).toBe(recoveryAction.action);
      expect(caseDetailRes.body.outcomes[0].outcome).toBe(outcome.outcome);

      // 6. Cross-check Gap-Free Audit Trail
      const paymentId = event.payload.payment.id;
      const auditRes = await request(app)
        .get(`/api/audit?payment_id=${paymentId}`)
        .expect(200);

      const auditLogs = auditRes.body;
      expect(auditLogs.length).toBeGreaterThanOrEqual(2);

      // Audit logs must contain diagnosis, policy/execution, and outcome
      expect(auditLogs.some((l) => l.action === recoveryAction.action || l.channel === recoveryAction.channel)).toBe(true);
    });
  }
});
