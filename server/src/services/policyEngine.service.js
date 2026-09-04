import Policy from '../models/Policy.model.js';
import RecoveryAction from '../models/RecoveryAction.model.js';
import Event from '../models/Event.model.js';
import { checkAllowed } from './stoppingRules.service.js';
import { logAudit } from './auditLogger.service.js';

const FALLBACK_POLICY = {
  cause: 'generic_decline',
  action: 'low_priority_notification',
  timing: 'immediate_low_priority',
  channel: 'sms',
  reason_template: 'Cause unclear; avoid aggressive contact',
};

/**
 * Selects an appropriate recovery policy for a diagnosed event,
 * runs the compliance/stopping rules guard, writes a RecoveryAction document,
 * and returns the resulting record.
 *
 * @param {object} diagnosis - Diagnosis object containing { event_id, cause, customer_id?, payment_id? }
 * @returns {Promise<object>} The created RecoveryAction document
 */
export async function selectPolicy(diagnosis) {
  const eventId = diagnosis.event_id || diagnosis.id;
  const rawCause = diagnosis.cause;

  let customerId = diagnosis.customer_id;
  let paymentId = diagnosis.payment_id;

  // Retrieve customer and payment IDs from Event if not provided directly
  if (!customerId || !paymentId) {
    const event = await Event.findOne({ id: eventId }).lean();
    if (event) {
      customerId = customerId || event.customer?.id || event.payload?.customer?.id;
      paymentId = paymentId || event.payload?.payment?.id || event.payload?.payment?.entity?.id;
    }
  }

  let policy = null;
  if (rawCause) {
    policy = await Policy.findOne({ cause: rawCause }).lean();
  }

  if (!policy) {
    console.warn(
      `[policyEngine] Warning: Unrecognized or missing cause "${rawCause}" for event ${eventId}. ` +
      `Falling back to generic_decline policy.`
    );
    policy = await Policy.findOne({ cause: 'generic_decline' }).lean();
    if (!policy) {
      policy = FALLBACK_POLICY;
    }
  }

  const isMandate = rawCause === 'mandate_halted';

  // Compliance Guard: Check contact attempt cap & cooldown window before execution
  const compliance = await checkAllowed(customerId, paymentId, {
    eventId,
    isMandate,
  });

  const recoveryActionData = {
    event_id: eventId,
    customer_id: customerId,
    payment_id: paymentId,
    action: policy.action,
    channel: policy.channel,
    timing: policy.timing,
    reason: policy.reason_template,
    attempt_number: compliance.attempt_number || 1,
    status: compliance.allowed ? 'allowed' : 'blocked',
    block_reason: compliance.allowed ? null : compliance.reason,
  };

  const recoveryAction = await RecoveryAction.create(recoveryActionData);

  if (compliance.allowed) {
    console.log(
      `[execution-guard] Event ${eventId}: RecoveryAction "${policy.action}" (${policy.channel}) ` +
      `ALLOWED (attempt ${recoveryAction.attempt_number}) — would execute`
    );
  } else {
    console.log(
      `[execution-guard] Event ${eventId}: RecoveryAction BLOCKED by stopping rule: "${compliance.reason}"`
    );
  }

  // Centrally log audit record for policy selection
  await logAudit({
    customer_id: customerId,
    payment_id: paymentId,
    cause: rawCause || policy.cause,
    policy: policy.action || policy.name,
    action: policy.action,
    channel: policy.channel,
    attempt_number: recoveryAction.attempt_number,
    stopping_rule_status: recoveryAction.status,
    reason: compliance.allowed
      ? policy.reason_template
      : (compliance.reason || 'Blocked by stopping rule'),
  });

  return recoveryAction;
}
