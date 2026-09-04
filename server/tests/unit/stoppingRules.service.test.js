import { describe, it, expect } from '@jest/globals';
import { evaluateStoppingRules } from '../../src/services/stoppingRules.service.js';
import { MAX_CONTACT_ATTEMPTS, COOLDOWN_HOURS } from '../../src/config/policyLimits.js';

describe('stoppingRules.service', () => {
  const now = new Date('2026-08-30T12:00:00.000Z');

  it('allows 1st attempt when no prior attempts exist', () => {
    const result = evaluateStoppingRules({
      priorAttempts: [],
      now,
    });

    expect(result.allowed).toBe(true);
    expect(result.attempt_number).toBe(1);
    expect(result.reason).toBeNull();
  });

  it('allows attempt when prior attempts are below MAX_CONTACT_ATTEMPTS and outside cooldown', () => {
    // 2 prior attempts, last attempt was 8 hours ago
    const priorAttempts = [
      { created_at: new Date(now.getTime() - 16 * 60 * 60 * 1000), status: 'allowed' },
      { created_at: new Date(now.getTime() - 8 * 60 * 60 * 1000), status: 'allowed' },
    ];

    const result = evaluateStoppingRules({
      priorAttempts,
      now,
    });

    expect(result.allowed).toBe(true);
    expect(result.attempt_number).toBe(3);
    expect(result.reason).toBeNull();
  });

  it('blocks attempt when exactly at MAX_CONTACT_ATTEMPTS (3 attempts reached)', () => {
    // Exactly 3 prior attempts (each outside cooldown)
    const priorAttempts = [
      { created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000), status: 'allowed' },
      { created_at: new Date(now.getTime() - 16 * 60 * 60 * 1000), status: 'allowed' },
      { created_at: new Date(now.getTime() - 8 * 60 * 60 * 1000), status: 'allowed' },
    ];

    const result = evaluateStoppingRules({
      priorAttempts,
      now,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('contact_cap_reached');
    expect(result.prior_attempts_count).toBe(3);
    expect(result.max_allowed).toBe(MAX_CONTACT_ATTEMPTS);
  });

  it('blocks attempt when over MAX_CONTACT_ATTEMPTS (e.g. 4 prior attempts)', () => {
    const priorAttempts = [
      { created_at: new Date(now.getTime() - 32 * 60 * 60 * 1000), status: 'allowed' },
      { created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000), status: 'allowed' },
      { created_at: new Date(now.getTime() - 16 * 60 * 60 * 1000), status: 'allowed' },
      { created_at: new Date(now.getTime() - 8 * 60 * 60 * 1000), status: 'allowed' },
    ];

    const result = evaluateStoppingRules({
      priorAttempts,
      now,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('contact_cap_reached');
  });

  it('blocks attempt inside the 6-hour cooldown window (< 6h since last attempt)', () => {
    // Last attempt was 3 hours ago
    const priorAttempts = [
      { created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000), status: 'allowed' },
    ];

    const result = evaluateStoppingRules({
      priorAttempts,
      now,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('cooldown_active');
    expect(result.cooldown_remaining_ms).toBeGreaterThan(0);
  });

  it('allows attempt just outside the 6-hour cooldown window (>= 6h since last attempt)', () => {
    // Last attempt was 6 hours and 1 minute ago
    const priorAttempts = [
      { created_at: new Date(now.getTime() - (6 * 60 + 1) * 60 * 1000), status: 'allowed' },
    ];

    const result = evaluateStoppingRules({
      priorAttempts,
      now,
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.attempt_number).toBe(2);
  });

  it('enforces mandate specific retry cap when isMandate is true', () => {
    const priorAttempts = [
      { created_at: new Date(now.getTime() - 20 * 60 * 60 * 1000), status: 'allowed' },
      { created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000), status: 'allowed' },
      { created_at: new Date(now.getTime() - 7 * 60 * 60 * 1000), status: 'allowed' },
    ];

    const result = evaluateStoppingRules({
      priorAttempts,
      isMandate: true,
      now,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('contact_cap_reached');
  });
});
