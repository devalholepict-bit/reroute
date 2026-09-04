import { env } from '../config/env.js';
import { logAudit } from './auditLogger.service.js';

const ML_SERVICE_URL = env.ML_SERVICE_URL || process.env.ML_SERVICE_URL || 'http://localhost:5001';
const DIAGNOSIS_TIMEOUT_MS = 3000;


// ── Local rules fallback (minimal copy of the Python rules table) ───────────
const ERROR_REASON_TO_CAUSE = {
  // Direct matches
  insufficient_funds:   'insufficient_funds',
  card_expired:         'card_expired',
  bank_server_timeout:  'bank_server_timeout',
  otp_timeout:          'otp_timeout',
  generic_decline:      'generic_decline',
  mandate_halted:       'mandate_halted',
  subscription_halted:  'mandate_halted',
  mandate_failed:       'mandate_halted',

  // Ambiguous / timeout variants
  timeout:              'ambiguous_timeout',
  gateway_timeout:      'ambiguous_timeout',
  unknown_timeout:      'ambiguous_timeout',

  // Additional Razorpay error_reasons
  payment_declined:     'generic_decline',
  card_declined:        'generic_decline',
  invalid_card:         'card_expired',
  expired_card:         'card_expired',
  server_error:         'bank_server_timeout',
  network_error:        'bank_server_timeout',
  authentication_failed: 'otp_timeout',
  otp_expired:          'otp_timeout',
  '3ds_failed':         'otp_timeout',
  issuer_declined:      'generic_decline',
  do_not_honor:         'generic_decline',
  transaction_not_permitted: 'generic_decline',
  insufficient_balance: 'insufficient_funds',
  low_balance:          'insufficient_funds',
};

function classifyCauseLocally(errorReason) {
  if (!errorReason) return 'ambiguous_timeout';
  const normalized = errorReason.trim().toLowerCase();
  return ERROR_REASON_TO_CAUSE[normalized] || 'ambiguous_timeout';
}

/**
 * Diagnose an event by calling the Flask ML service.
 * Falls back to local rules on any failure.
 *
 * @param {object} normalizedEvent — the normalized event from MongoDB
 * @returns {Promise<object>} — { cause, self_recovers_likely, confidence, diagnosis_method, model_version }
 */
export async function diagnoseEvent(normalizedEvent) {
  let diagResult;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DIAGNOSIS_TIMEOUT_MS);

    const response = await fetch(`${ML_SERVICE_URL}/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedEvent),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ML service returned ${response.status}`);
    }

    const result = await response.json();

    // Validate the response has required fields
    if (!result.cause) {
      throw new Error('ML service response missing cause field');
    }

    diagResult = result;
  } catch (err) {
    // Timeout, connection refused, non-200, etc. → fall back to local rules
    console.warn(`[diagnosisClient] ML service unavailable (${err.message}), using rules fallback`);

    const errorReason = normalizedEvent?.payload?.payment?.error_reason || '';
    const cause = classifyCauseLocally(errorReason);

    diagResult = {
      cause,
      self_recovers_likely: null,
      confidence: null,
      diagnosis_method: 'rules_fallback',
      model_version: null,
    };
  }

  // Centrally log audit record for diagnosis
  const customerId =
    normalizedEvent?.customer_id ||
    normalizedEvent?.customer?.id ||
    normalizedEvent?.payload?.customer?.id ||
    null;
  const paymentId =
    normalizedEvent?.payment_id ||
    normalizedEvent?.payload?.payment?.id ||
    normalizedEvent?.payload?.payment?.entity?.id ||
    null;

  await logAudit({
    customer_id: customerId,
    payment_id: paymentId,
    cause: diagResult.cause,
    confidence: diagResult.confidence,
    reason: `Diagnosed via ${diagResult.diagnosis_method || 'ml_service'}`,
  });

  return diagResult;
}
