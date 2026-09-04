import {
  MAX_CONTACT_ATTEMPTS,
  COOLDOWN_HOURS,
  MANDATE_RETRY_LIMIT,
} from '../config/policyLimits.js';
import RecoveryAction from '../models/RecoveryAction.model.js';
import AuditEvent from '../models/AuditEvent.model.js';
import Event from '../models/Event.model.js';
import { logAudit } from './auditLogger.service.js';

/**
 * Pure evaluation function for boundary checks.
 *
 * @param {object} params
 * @param {Array<{created_at: Date|string, status?: string}>} [params.priorAttempts=[]]
 * @param {boolean} [params.isMandate=false]
 * @param {Date|number} [params.now=new Date()]
 * @param {number} [params.maxAttempts]
 * @param {number} [params.cooldownHours]
 * @returns {{ allowed: boolean, reason: string|null, attempt_number?: number, next_allowed_at?: Date, cooldown_remaining_ms?: number }}
 */
export function evaluateStoppingRules({
  priorAttempts = [],
  isMandate = false,
  now = new Date(),
  maxAttempts = isMandate ? MANDATE_RETRY_LIMIT : MAX_CONTACT_ATTEMPTS,
  cooldownHours = COOLDOWN_HOURS,
} = {}) {
  const currentTime = new Date(now).getTime();
  const validAttempts = priorAttempts.filter(
    (a) => a.status === 'allowed' || a.status === 'pending' || !a.status
  );

  // 1. Check Maximum Contact Attempt Cap
  if (validAttempts.length >= maxAttempts) {
    return {
      allowed: false,
      reason: 'contact_cap_reached',
      prior_attempts_count: validAttempts.length,
      max_allowed: maxAttempts,
    };
  }

  // 2. Check Cooldown Window between consecutive attempts
  if (validAttempts.length > 0) {
    // Sort chronologically
    const sorted = [...validAttempts].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const lastAttempt = sorted[sorted.length - 1];
    const lastAttemptTime = new Date(lastAttempt.created_at).getTime();
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const elapsedMs = currentTime - lastAttemptTime;

    if (elapsedMs < cooldownMs) {
      const remainingMs = cooldownMs - elapsedMs;
      const nextAllowedAt = new Date(lastAttemptTime + cooldownMs);
      return {
        allowed: false,
        reason: 'cooldown_active',
        last_attempt_at: new Date(lastAttemptTime),
        next_allowed_at: nextAllowedAt,
        cooldown_remaining_ms: remainingMs,
        cooldown_hours: cooldownHours,
      };
    }
  }

  // 3. Allowed
  return {
    allowed: true,
    reason: null,
    attempt_number: validAttempts.length + 1,
    max_allowed: maxAttempts,
  };
}

/**
 * Checks whether a recovery action is allowed to execute for a customer and payment.
 * Automatically queries MongoDB for prior attempts and logs an audit event if blocked.
 *
 * @param {string} customerId
 * @param {string} paymentId
 * @param {object} [options={}]
 * @param {string} [options.eventId]
 * @param {boolean} [options.isMandate=false]
 * @param {Date} [options.now=new Date()]
 * @param {boolean} [options.writeAudit=true]
 * @returns {Promise<{ allowed: boolean, reason: string|null, attempt_number?: number }>}
 */
export async function checkAllowed(customerId, paymentId, options = {}) {
  const { eventId, isMandate = false, now = new Date(), writeAudit = true } = options;

  let priorAttempts = [];

  if (customerId || paymentId) {
    // Find prior attempts either by direct fields on RecoveryAction or via Event lookups
    const query = { $or: [] };
    if (customerId && paymentId) {
      query.$or.push({ customer_id: customerId, payment_id: paymentId });
    }
    if (paymentId) {
      query.$or.push({ payment_id: paymentId });
    }

    // Also look up event IDs matching this payment / customer
    if (paymentId) {
      const relatedEvents = await Event.find({
        $or: [
          { 'payload.payment.id': paymentId },
          { 'payload.payment.entity.id': paymentId },
        ],
      })
        .select('id')
        .lean();
      const eventIds = relatedEvents.map((e) => e.id);
      if (eventIds.length > 0) {
        query.$or.push({ event_id: { $in: eventIds } });
      }
    }

    if (query.$or.length > 0) {
      const filter = { $and: [{ $or: query.$or }] };
      if (eventId) {
        filter.$and.push({ event_id: { $ne: eventId } });
      }
      if (options.excludeActionId) {
        filter.$and.push({ _id: { $ne: options.excludeActionId } });
      }
      priorAttempts = await RecoveryAction.find(filter).sort({ created_at: 1 }).lean();
    }
  }

  const result = evaluateStoppingRules({
    priorAttempts,
    isMandate,
    now,
  });

  if (!result.allowed) {
    if (writeAudit) {
      const auditType =
        result.reason === 'contact_cap_reached' ? 'stopped_contact_cap' : 'stopped_cooldown';

      console.warn(
        `[compliance] Recovery BLOCKED for customer="${customerId}" payment="${paymentId}": ` +
        `reason="${result.reason}"`
      );

      try {
        await AuditEvent.create({
          event_id: eventId,
          customer_id: customerId,
          payment_id: paymentId,
          event_type: auditType,
          reason: result.reason,
          details: {
            prior_attempts_count: priorAttempts.length,
            ...result,
          },
        });
      } catch (auditErr) {
        console.error('[compliance] Error writing audit event:', auditErr.message);
      }

      await logAudit({
        customer_id: customerId,
        payment_id: paymentId,
        attempt_number: result.attempt_number || (priorAttempts.length + 1),
        stopping_rule_status: 'blocked',
        reason: result.reason || 'Blocked by stopping rule',
      });
    }
  } else if (result.allowed) {
    console.log(
      `[compliance] Recovery ALLOWED (attempt ${result.attempt_number}) for customer="${customerId}" ` +
      `payment="${paymentId}" — would execute`
    );

    if (writeAudit) {
      await logAudit({
        customer_id: customerId,
        payment_id: paymentId,
        attempt_number: result.attempt_number,
        stopping_rule_status: 'allowed',
        reason: 'Stopping rules passed — recovery outreach allowed',
      });
    }
  }

  return result;
}
