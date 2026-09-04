import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { advanceTime } from '../../src/services/promiseTracker.service.js';
import PromiseModel from '../../src/models/Promise.model.js';
import Event from '../../src/models/Event.model.js';
import Outcome from '../../src/models/Outcome.model.js';
import AuditLog from '../../src/models/AuditLog.model.js';
import AuditEvent from '../../src/models/AuditEvent.model.js';
import RecoveryAction from '../../src/models/RecoveryAction.model.js';

describe('promiseTracker.service', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(Event, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
    jest.spyOn(Event, 'find').mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve([]),
      }),
    });
    jest.spyOn(Outcome, 'create').mockResolvedValue({});
    jest.spyOn(AuditLog, 'create').mockResolvedValue({
      toObject: () => ({}),
    });
    jest.spyOn(AuditEvent, 'create').mockResolvedValue({});
    jest.spyOn(RecoveryAction, 'find').mockReturnValue({
      sort: () => ({
        lean: () => Promise.resolve([]),
      }),
    });
  });

  it('resolves a pending promise to fulfilled with forceStatus="fulfilled" and never leaves it pending', async () => {
    const mockPromiseDoc = {
      case_id: 'evt_promise_001',
      customer_id: 'cust_001',
      payment_id: 'pay_001',
      amount: 2500000,
      status: 'pending',
      save: jest.fn().mockResolvedValue(true),
      toObject: function () {
        return { ...this };
      },
    };

    jest.spyOn(PromiseModel, 'findOne').mockResolvedValue(mockPromiseDoc);

    const result = await advanceTime('evt_promise_001', { forceStatus: 'fulfilled' });

    expect(result.resolution).toBe('fulfilled');
    expect(result.promise.status).toBe('fulfilled');
    expect(result.eventStatus).toBe('resolved');
    expect(result.amount_recovered).toBe(2500000);
    expect(mockPromiseDoc.save).toHaveBeenCalled();
    expect(Event.updateOne).toHaveBeenCalledWith({ id: 'evt_promise_001' }, { status: 'resolved' });
  });

  it('resolves a pending promise to missed with forceStatus="missed" and marks event resolved', async () => {
    const mockPromiseDoc = {
      case_id: 'evt_promise_002',
      customer_id: 'cust_002',
      payment_id: 'pay_002',
      amount: 2500000,
      status: 'pending',
      save: jest.fn().mockResolvedValue(true),
      toObject: function () {
        return { ...this };
      },
    };

    jest.spyOn(PromiseModel, 'findOne').mockResolvedValue(mockPromiseDoc);

    const result = await advanceTime('evt_promise_002', { forceStatus: 'missed' });

    expect(result.resolution).toBe('missed');
    expect(result.promise.status).toBe('missed');
    expect(result.eventStatus).toBe('resolved');
    expect(result.amount_recovered).toBe(0);
    expect(mockPromiseDoc.save).toHaveBeenCalled();
  });

  it('throws an error if no pending promise exists for the given case ID', async () => {
    jest.spyOn(PromiseModel, 'findOne').mockResolvedValue(null);

    await expect(advanceTime('evt_non_existent')).rejects.toThrow(
      'No pending promise-to-pay found for case ID: "evt_non_existent"'
    );
  });
});
