import Outcome from '../models/Outcome.model.js';
import Event from '../models/Event.model.js';
import { createPromise } from './promiseTracker.service.js';
import { logAudit } from './auditLogger.service.js';

/**
 * Explicit outcome probability distributions per cause category.
 *
 * Weightings reflect real-world customer behavior:
 * - otp_timeout: Highest immediate recovery rate (~70%) as user was active in-session.
 * - card_expired: Moderate recovery (~40%) requiring manual card entry, with significant no-response (~35%).
 * - insufficient_funds: Predominantly promises to pay (~50%) awaiting salary/fund deposit.
 * - bank_server_timeout: Mixed (~45% recover automatically upon bank recovery, ~25% no-response).
 * - mandate_halted: Predominantly promises to pay (~60%) following NPCI mandate cap.
 * - generic_decline / ambiguous_timeout: Heavy skew toward no-response (~45%) and repeated failure (~35%).
 */
export const OUTCOME_WEIGHTS = {
  otp_timeout: {
    paid_immediately: 0.70,
    no_response: 0.15,
    promised_to_pay: 0.10,
    failed_again: 0.05,
  },
  card_expired: {
    paid_immediately: 0.40,
    no_response: 0.35,
    promised_to_pay: 0.15,
    failed_again: 0.10,
  },
  insufficient_funds: {
    promised_to_pay: 0.50,
    paid_immediately: 0.20,
    no_response: 0.20,
    failed_again: 0.10,
  },
  bank_server_timeout: {
    paid_immediately: 0.45,
    no_response: 0.25,
    promised_to_pay: 0.15,
    failed_again: 0.15,
  },
  mandate_halted: {
    promised_to_pay: 0.60,
    paid_immediately: 0.15,
    no_response: 0.15,
    failed_again: 0.10,
  },
  generic_decline: {
    no_response: 0.45,
    failed_again: 0.35,
    promised_to_pay: 0.10,
    paid_immediately: 0.10,
  },
  ambiguous_timeout: {
    no_response: 0.45,
    failed_again: 0.35,
    promised_to_pay: 0.10,
    paid_immediately: 0.10,
  },
};

/**
 * Samples a random outcome according to the probability distribution for a given cause.
 *
 * @param {string} cause
 * @param {number} [randomValue=Math.random()] - Optional deterministic random seed for testing
 * @returns {'paid_immediately'|'promised_to_pay'|'no_response'|'failed_again'}
 */
export function sampleOutcome(cause, randomValue = Math.random()) {
  const weights = OUTCOME_WEIGHTS[cause] || OUTCOME_WEIGHTS.generic_decline;

  let cumulative = 0;
  for (const [outcome, prob] of Object.entries(weights)) {
    cumulative += prob;
    if (randomValue <= cumulative) {
      return outcome;
    }
  }

  return 'no_response';
}

/**
 * Simulates the recovery outcome for an executed RecoveryAction and updates Event state.
 *
 * If outcome is 'promised_to_pay', creates a pending Promise record and leaves Event as 'executed'.
 * Terminal outcomes (paid_immediately, no_response, failed_again) transition Event to 'resolved'.
 *
 * @param {object} recoveryAction - The executed RecoveryAction record
 * @param {object} [options={}]
 * @param {string} [options.cause]
 * @param {number} [options.randomValue]
 * @param {object} [options.event]
 * @returns {Promise<{ outcome: string, amount_recovered: number, outcomeRecord: object, eventStatus: string, promise?: object }>}
 */
export async function simulateOutcome(recoveryAction, options = {}) {
  const eventId = recoveryAction.event_id;
  const recoveryActionId = recoveryAction._id || recoveryAction.id;

  let event = options.event;
  if (!event && eventId) {
    event = await Event.findOne({ id: eventId }).lean();
  }

  const cause =
    options.cause ||
    event?.payload?.payment?.error_reason ||
    recoveryAction.reason_code ||
    'generic_decline';

  // Check for forced outcome override first (e.g. for deterministic demo scenarios)
  const forcedOutcome =
    options.forced_outcome ||
    options.forcedOutcome ||
    event?.payload?.forced_outcome ||
    event?.raw_payload?.forced_outcome ||
    null;

  // Sample outcome according to cause weighting if not forced
  const outcome = forcedOutcome || sampleOutcome(cause, options.randomValue);

  // Compute amount recovered
  const originalAmount = event?.payload?.payment?.amount || 99900;
  const amountRecovered = outcome === 'paid_immediately' ? originalAmount : 0;

  // Persist Outcome record
  const outcomeRecord = await Outcome.create({
    recovery_action_id: recoveryActionId,
    event_id: eventId,
    outcome,
    amount_recovered: amountRecovered,
    created_at: options.now || new Date(),
  });

  // Centrally log audit record for simulated outcome
  const customerId =
    recoveryAction.customer_id ||
    event?.customer?.id ||
    event?.payload?.customer?.id ||
    null;
  const paymentId =
    recoveryAction.payment_id ||
    event?.payload?.payment?.id ||
    event?.payload?.payment?.entity?.id ||
    null;

  await logAudit({
    customer_id: customerId,
    payment_id: paymentId,
    cause: cause,
    action: recoveryAction.action,
    channel: recoveryAction.channel,
    attempt_number: recoveryAction.attempt_number,
    outcome: outcome,
    reason: `Outcome recorded: ${outcome} (amount recovered: ₹${amountRecovered / 100})`,
  });

  let createdPromiseRecord = null;

  // If promised_to_pay, create the Promise-to-Pay tracking record
  if (outcome === 'promised_to_pay') {
    createdPromiseRecord = await createPromise(recoveryAction, {
      event,
      cause,
      amount: originalAmount,
      now: options.now,
    });
  }

  // Determine Event status transition
  // Terminal outcomes (everything except promised_to_pay) transition to 'resolved'
  const isTerminal = outcome !== 'promised_to_pay';
  const eventStatus = isTerminal ? 'resolved' : 'executed';

  if (eventId) {
    await Event.updateOne({ id: eventId }, { status: eventStatus });
  }

  console.log(
    `[outcome-simulator] Event ${eventId} [${cause}] -> OUTCOME: "${outcome}" ` +
    `(amount_recovered: ${amountRecovered}) -> Event status: "${eventStatus}"`
  );

  return {
    outcome,
    amount_recovered: amountRecovered,
    outcomeRecord: outcomeRecord.toObject(),
    eventStatus,
    promise: createdPromiseRecord,
  };
}
