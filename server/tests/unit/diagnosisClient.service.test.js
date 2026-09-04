import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { diagnoseEvent } from '../../src/services/diagnosisClient.service.js';
import AuditLog from '../../src/models/AuditLog.model.js';

describe('diagnosisClient.service', () => {
  let originalFetch;
  let originalConsoleWarn;

  beforeEach(() => {
    jest.restoreAllMocks();
    originalFetch = global.fetch;
    originalConsoleWarn = console.warn;
    console.warn = jest.fn();
    jest.spyOn(AuditLog, 'create').mockResolvedValue({
      toObject: () => ({}),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    console.warn = originalConsoleWarn;
    jest.restoreAllMocks();
  });

  it('calls Flask ML service and returns diagnosis when ML service succeeds', async () => {
    const mockMLResponse = {
      cause: 'insufficient_funds',
      self_recovers_likely: false,
      confidence: 0.89,
      diagnosis_method: 'rules+ml',
      model_version: 'v1',
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMLResponse),
    });

    const event = {
      id: 'evt_test_1',
      payload: { payment: { id: 'pay_1', error_reason: 'insufficient_funds' } },
      customer: { id: 'cust_1' },
    };

    const result = await diagnoseEvent(event);

    expect(result.cause).toBe('insufficient_funds');
    expect(result.diagnosis_method).toBe('rules+ml');
    expect(result.confidence).toBe(0.89);
    expect(result.self_recovers_likely).toBe(false);
    expect(result.model_version).toBe('v1');
  });

  it('falls back to local rules when Flask ML service fails/times out', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused at http://localhost:5001'));

    const event = {
      id: 'evt_test_fallback',
      payload: { payment: { id: 'pay_fb', error_reason: 'otp_timeout' } },
      customer: { id: 'cust_fb' },
    };

    const result = await diagnoseEvent(event);

    expect(result.cause).toBe('otp_timeout');
    expect(result.diagnosis_method).toBe('rules_fallback');
    expect(result.self_recovers_likely).toBeNull();
    expect(result.confidence).toBeNull();
    expect(result.model_version).toBeNull();

    // Confirm warning was logged
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[diagnosisClient] ML service unavailable')
    );
  });

  it('falls back to local rules with ambiguous_timeout for unknown error reasons when ML fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const event = {
      id: 'evt_test_unknown',
      payload: { payment: { id: 'pay_unk', error_reason: 'some_weird_unknown_code' } },
    };

    const result = await diagnoseEvent(event);

    expect(result.cause).toBe('ambiguous_timeout');
    expect(result.diagnosis_method).toBe('rules_fallback');
  });
});
