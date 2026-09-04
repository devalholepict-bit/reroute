import { describe, it, expect } from '@jest/globals';
import { sampleOutcome, OUTCOME_WEIGHTS } from '../../src/services/outcomeSimulator.service.js';

describe('outcomeSimulator.service', () => {
  it('samples deterministic outcomes when random values are provided', () => {
    // For otp_timeout: paid_immediately is 0.0 - 0.70
    expect(sampleOutcome('otp_timeout', 0.1)).toBe('paid_immediately');
    expect(sampleOutcome('otp_timeout', 0.69)).toBe('paid_immediately');

    // For insufficient_funds: promised_to_pay is 0.0 - 0.50
    expect(sampleOutcome('insufficient_funds', 0.25)).toBe('promised_to_pay');
  });

  it('generates expected statistical distribution across 200 iterations for each cause', () => {
    const BATCH_SIZE = 200;

    // Test otp_timeout: expected ~70% paid_immediately
    const otpCounts = { paid_immediately: 0, no_response: 0, promised_to_pay: 0, failed_again: 0 };
    for (let i = 0; i < BATCH_SIZE; i++) {
      const outcome = sampleOutcome('otp_timeout');
      otpCounts[outcome] = (otpCounts[outcome] || 0) + 1;
    }
    // Majority (> 55% of 200, i.e. > 110) should be paid_immediately
    expect(otpCounts.paid_immediately).toBeGreaterThan(100);
    expect(otpCounts.paid_immediately).toBeGreaterThan(otpCounts.no_response);

    // Test mandate_halted: expected ~60% promised_to_pay
    const mandateCounts = { paid_immediately: 0, no_response: 0, promised_to_pay: 0, failed_again: 0 };
    for (let i = 0; i < BATCH_SIZE; i++) {
      const outcome = sampleOutcome('mandate_halted');
      mandateCounts[outcome] = (mandateCounts[outcome] || 0) + 1;
    }
    // Majority (> 45% of 200, i.e. > 90) should be promised_to_pay
    expect(mandateCounts.promised_to_pay).toBeGreaterThan(80);

    // Test generic_decline: expected predominant no_response (~45%) + failed_again (~35%)
    const genericCounts = { paid_immediately: 0, no_response: 0, promised_to_pay: 0, failed_again: 0 };
    for (let i = 0; i < BATCH_SIZE; i++) {
      const outcome = sampleOutcome('generic_decline');
      genericCounts[outcome] = (genericCounts[outcome] || 0) + 1;
    }
    expect(genericCounts.no_response + genericCounts.failed_again).toBeGreaterThan(120);
  });
});
