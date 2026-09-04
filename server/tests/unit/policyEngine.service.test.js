import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { selectPolicy } from '../../src/services/policyEngine.service.js';
import Policy from '../../src/models/Policy.model.js';
import RecoveryAction from '../../src/models/RecoveryAction.model.js';
import AuditLog from '../../src/models/AuditLog.model.js';
import Event from '../../src/models/Event.model.js';
import { DEFAULT_POLICIES } from '../../../scripts/seed-policies.js';

describe('policyEngine.service', () => {
  let originalConsoleWarn;

  beforeEach(() => {
    jest.restoreAllMocks();
    originalConsoleWarn = console.warn;
    console.warn = jest.fn();

    // Mock AuditLog.create with toObject
    jest.spyOn(AuditLog, 'create').mockResolvedValue({
      toObject: () => ({}),
    });

    // Mock RecoveryAction.find for stoppingRules check
    jest.spyOn(RecoveryAction, 'find').mockReturnValue({
      sort: () => ({
        lean: () => Promise.resolve([]),
      }),
    });

    // Mock Event.find
    jest.spyOn(Event, 'find').mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([]),
      }),
    });

    // Mock RecoveryAction.create
    jest.spyOn(RecoveryAction, 'create').mockImplementation((data) =>
      Promise.resolve({
        ...data,
        _id: 'ra_mock_id',
        toObject: () => ({ ...data, _id: 'ra_mock_id' }),
      })
    );
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
  });

  it('maps every seeded cause to its correct policy action, channel, and reason', async () => {
    for (const seededPolicy of DEFAULT_POLICIES) {
      jest.spyOn(Policy, 'findOne').mockReturnValue({
        lean: () => Promise.resolve(seededPolicy),
      });

      const result = await selectPolicy({
        event_id: `evt_${seededPolicy.cause}`,
        cause: seededPolicy.cause,
        customer_id: 'cust_test',
        payment_id: 'pay_test',
      });

      expect(result.action).toBe(seededPolicy.action);
      expect(result.channel).toBe(seededPolicy.channel);
      expect(result.timing).toBe(seededPolicy.timing);
      expect(result.reason).toBe(seededPolicy.reason_template);
      expect(result.status).toBe('allowed');
    }
  });

  it('falls back to generic_decline policy and logs a warning for unrecognized cause', async () => {
    const genericPolicy = DEFAULT_POLICIES.find((p) => p.cause === 'generic_decline');

    // First findOne for unrecognized returns null, second for generic_decline returns policy
    jest.spyOn(Policy, 'findOne')
      .mockReturnValueOnce({ lean: () => Promise.resolve(null) })
      .mockReturnValueOnce({ lean: () => Promise.resolve(genericPolicy) });

    const result = await selectPolicy({
      event_id: 'evt_unrecognized_cause',
      cause: 'non_existent_cause_category',
      customer_id: 'cust_unknown',
      payment_id: 'pay_unknown',
    });

    expect(result.action).toBe('low_priority_notification');
    expect(result.channel).toBe('sms');

    // Assert that the warning was actually logged
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[policyEngine] Warning: Unrecognized or missing cause "non_existent_cause_category"')
    );
  });
});
