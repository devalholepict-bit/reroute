import PromiseModel from '../models/Promise.model.js';
import Event from '../models/Event.model.js';
import Outcome from '../models/Outcome.model.js';
import { checkAllowed } from './stoppingRules.service.js';
import { logAudit } from './auditLogger.service.js';

// Default resolution weights when time is advanced: 75% fulfilled, 25% missed
export const PROMISE_RESOLUTION_WEIGHTS = {
  fulfilled: 0.75,
  missed: 0.25,
};

/**
 * Creates and persists a new Promise-to-Pay record for a recovery action.
 *
 * @param {object} recoveryAction - The executed RecoveryAction document/object
 * @param {object} [options={}]
 * @returns {Promise<object>} The created Promise record
 */
export async function createPromise(recoveryAction, options = {}) {
  const caseId = recoveryAction.event_id;
  let event = options.event;
  if (!event && caseId) {
    event = await Event.findOne({ id: caseId }).lean();
  }

  const amount = options.amount || event?.payload?.payment?.amount || 99900;
  const customerId =
    recoveryAction.customer_id ||
    event?.customer?.id ||
    event?.payload?.customer?.id;
  const paymentId =
    recoveryAction.payment_id ||
    event?.payload?.payment?.id ||
    event?.payload?.payment?.entity?.id;

  // Due date: 48 hours out (simulated)
  const dueDate = options.due_date || new Date(Date.now() + 48 * 60 * 60 * 1000);

  const promiseRecord = await PromiseModel.create({
    case_id: caseId,
    recovery_action_id: recoveryAction._id || recoveryAction.id,
    customer_id: customerId,
    payment_id: paymentId,
    amount,
    due_date: dueDate,
    status: 'pending',
    created_at: options.now || new Date(),
  });

  console.log(
    `[promise-tracker] Created Promise for case "${caseId}" | Amount: ₹${amount / 100} | Due: ${dueDate.toISOString()}`
  );

  // Centrally log audit record for promise creation
  await logAudit({
    customer_id: customerId,
    payment_id: paymentId,
    action: recoveryAction?.action || 'promise_created',
    channel: recoveryAction?.channel || null,
    attempt_number: recoveryAction?.attempt_number || null,
    outcome: 'promised_to_pay',
    reason: `Promise-to-pay registered for ₹${amount / 100}, due: ${dueDate.toISOString()}`,
  });

  return promiseRecord.toObject();
}

/**
 * Advances time to manually resolve a pending promise (fulfilled vs missed)
 * without waiting for actual real-world hours/days to pass.
 *
 * @param {string} caseId - The event/case ID
 * @param {object} [options={}]
 * @param {'fulfilled'|'missed'} [options.forceStatus] - Optional override for deterministic testing
 * @param {number} [options.randomValue=Math.random()]
 * @param {Date} [options.now=new Date()]
 * @returns {Promise<{ promise: object, resolution: string, eventStatus: string, amount_recovered: number }>}
 */
export async function advanceTime(caseId, options = {}) {
  const promise = await PromiseModel.findOne({
    case_id: caseId,
    status: 'pending',
  });

  if (!promise) {
    throw new Error(`No pending promise-to-pay found for case ID: "${caseId}"`);
  }

  // Determine resolution (weighted sample or forced for testing)
  let resolution = options.forceStatus;
  if (!resolution) {
    const rand = options.randomValue ?? Math.random();
    resolution = rand < PROMISE_RESOLUTION_WEIGHTS.fulfilled ? 'fulfilled' : 'missed';
  }

  const resolvedAt = options.now || new Date();
  let amountRecovered = 0;

  if (resolution === 'fulfilled') {
    promise.status = 'fulfilled';
    promise.fulfilled_at = resolvedAt;
    amountRecovered = promise.amount || 99900;

    // Update Event to resolved
    await Event.updateOne({ id: caseId }, { status: 'resolved' });

    // Update Outcome record
    await Outcome.create({
      recovery_action_id: promise.recovery_action_id,
      event_id: caseId,
      outcome: 'paid_immediately',
      amount_recovered: amountRecovered,
      created_at: resolvedAt,
    });

    console.log(
      `[promise-tracker] Case "${caseId}" promise FULFILLED. Amount recovered: ₹${amountRecovered / 100}. Event marked resolved.`
    );

    // Centrally log audit record for fulfilled promise
    await logAudit({
      customer_id: promise.customer_id,
      payment_id: promise.payment_id,
      action: 'promise_fulfilled',
      outcome: 'paid_immediately',
      reason: `Promise fulfilled. Recovered: ₹${amountRecovered / 100}`,
    });
  } else {
    // Missed promise
    promise.status = 'missed';
    promise.fulfilled_at = null;
    amountRecovered = 0;

    // Enforce stopping rules check — verify contact cap limits apply
    const compliance = await checkAllowed(promise.customer_id, promise.payment_id, {
      eventId: caseId,
      writeAudit: true,
    });

    console.log(
      `[promise-tracker] Case "${caseId}" promise MISSED. Stopping rules verified (allowed=${compliance.allowed}, attempts=${compliance.prior_attempts_count || 1}).`
    );

    // Event resolves as unrecovered/missed without runaway retries
    await Event.updateOne({ id: caseId }, { status: 'resolved' });

    await Outcome.create({
      recovery_action_id: promise.recovery_action_id,
      event_id: caseId,
      outcome: 'failed_again',
      amount_recovered: 0,
      created_at: resolvedAt,
    });

    // Centrally log audit record for missed promise
    await logAudit({
      customer_id: promise.customer_id,
      payment_id: promise.payment_id,
      action: 'promise_missed',
      outcome: 'failed_again',
      reason: 'Promise missed. No funds recovered; stopping rules verified.',
    });
  }

  await promise.save();

  return {
    promise: promise.toObject(),
    resolution,
    eventStatus: 'resolved',
    amount_recovered: amountRecovered,
  };
}

/**
 * Retrieves all promises or a single promise by case ID.
 */
export async function getPromises(query = {}) {
  return PromiseModel.find(query).sort({ created_at: -1 }).lean();
}
