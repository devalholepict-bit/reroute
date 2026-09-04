import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { setupTestDB, clearTestDB, teardownTestDB } from './dbHelper.js';


describe('Suite 6: Phase 16 Demo Scenario Regression (3 Consecutive Runs)', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  const EXPECTED_DEMO_CASES = [
    {
      caseIndex: 0,
      amount: 1499000,
      cause: 'insufficient_funds',
      segment: 'returning',
      expectedAction: 'delayed_retry',
      expectedChannel: 'sms',
      expectedOutcome: 'paid_immediately',
      expectedStatus: 'resolved',
      desc: 'Case 1: ₹14,990, insufficient_funds → delayed SMS → recovered',
    },
    {
      caseIndex: 1,
      amount: 850000,
      cause: 'card_expired',
      segment: 'new',
      expectedAction: 'customer_update_request',
      expectedChannel: 'email',
      expectedOutcome: 'paid_immediately',
      expectedStatus: 'resolved',
      desc: 'Case 2: ₹8,500, card_expired → card-update email → recovered',
    },
    {
      caseIndex: 2,
      amount: 200000,
      cause: 'otp_timeout',
      segment: 'returning',
      expectedAction: 'send_retry_link',
      expectedChannel: 'retry_link',
      expectedOutcome: 'paid_immediately',
      expectedStatus: 'resolved',
      desc: 'Case 3: ₹2,000, otp_timeout → same-session retry link → recovered',
    },
    {
      caseIndex: 3,
      amount: 2500000,
      cause: 'mandate_halted',
      segment: 'high_value',
      expectedAction: 'capped_retry_escalation',
      expectedChannel: 'sms_then_prompt',
      expectedOutcome: 'promised_to_pay',
      expectedStatus: 'executed', // Promise-to-pay leaves event in executed until advanceTime
      desc: 'Case 4: ₹25,000, mandate_halted → capped retry → promise-to-pay',
    },
    {
      caseIndex: 4,
      amount: 750000,
      cause: 'bank_server_timeout',
      segment: 'new',
      expectedAction: 'delayed_retry',
      expectedChannel: 'sms',
      expectedOutcome: 'no_response',
      expectedStatus: 'resolved',
      desc: 'Case 5: ₹7,500, bank_server_timeout → delayed SMS → no response (stopping rule demo)',
    },
  ];

  async function executeAndValidateDemoRun(runNumber) {
    const res = await request(app)
      .post('/api/simulator/run')
      .set('x-dev-secret', env.SIMULATOR_DEV_SECRET)
      .send({})
      .expect(200);


    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(5);
    expect(res.body.created).toHaveLength(5);

    const { events, recovery_actions, outcomes } = res.body;

    const runOutcomes = [];

    for (let i = 0; i < EXPECTED_DEMO_CASES.length; i++) {
      const exp = EXPECTED_DEMO_CASES[i];
      const evt = events[i];
      const ra = recovery_actions[i];
      const out = outcomes[i];

      expect(evt.payload.payment.amount).toBe(exp.amount);
      expect(evt.payload.payment.error_reason).toBe(exp.cause);
      expect(evt.customer.segment).toBe(exp.segment);
      expect(evt.status).toBe(exp.expectedStatus);

      expect(ra.action).toBe(exp.expectedAction);
      expect(ra.channel).toBe(exp.expectedChannel);
      expect(ra.status).toBe('executed');

      expect(out.outcome).toBe(exp.expectedOutcome);
      runOutcomes.push({
        cause: exp.cause,
        outcome: out.outcome,
        amount: exp.amount,
        action: exp.expectedAction,
      });
    }

    return { createdIds: res.body.created, runOutcomes };
  }

  it('Run 1, Run 2, and Run 3 produce 100% deterministic, byte-for-byte identical outcomes with 0 flakes', async () => {
    // Run 1
    const run1 = await executeAndValidateDemoRun(1);
    await clearTestDB();

    // Run 2
    const run2 = await executeAndValidateDemoRun(2);
    await clearTestDB();

    // Run 3
    const run3 = await executeAndValidateDemoRun(3);

    // Cross-run assertions: All 3 runs have identical outcomes in exact same sequence
    expect(run1.runOutcomes).toEqual(run2.runOutcomes);
    expect(run2.runOutcomes).toEqual(run3.runOutcomes);

    // Event IDs are freshly generated across runs (no collision)
    const idSet = new Set([...run1.createdIds, ...run2.createdIds, ...run3.createdIds]);
    expect(idSet.size).toBe(15);
  });
});
