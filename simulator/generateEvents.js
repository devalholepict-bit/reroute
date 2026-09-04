/**
 * Event generator functions.
 * - generateEvent(cause, eventType) → single event
 * - generateBatch(count, causeDistribution) → array of events
 */

import TEMPLATES, { VALID_CAUSES } from './eventTemplates.js';

const DEFAULT_EVENT_TYPE = 'payment.failed';

/**
 * Generate a single Razorpay-shaped event.
 * @param {string} cause - One of VALID_CAUSES
 * @param {string} [eventType='payment.failed'] - Razorpay event type
 * @returns {object} A schema-correct event
 * @throws {Error} If cause is unrecognized
 */
export function generateEvent(cause, eventType = DEFAULT_EVENT_TYPE) {
  if (!VALID_CAUSES.includes(cause)) {
    throw new Error(
      `Unrecognized cause "${cause}". Valid causes: ${VALID_CAUSES.join(', ')}`
    );
  }
  return TEMPLATES[cause](eventType);
}

/**
 * Generate a batch of events.
 *
 * @param {number} count - Total number of events to generate
 * @param {Object<string, number>} [causeDistribution] - Map of cause → weight.
 *   If omitted, events are distributed uniformly across all causes.
 *   Example: { insufficient_funds: 3, card_expired: 1 } → 75% / 25%
 * @returns {object[]} Array of schema-correct events
 */
export function generateBatch(count, causeDistribution) {
  // Build weighted cause list
  let weightedCauses;

  if (causeDistribution && Object.keys(causeDistribution).length > 0) {
    // Validate all provided causes
    for (const cause of Object.keys(causeDistribution)) {
      if (!VALID_CAUSES.includes(cause)) {
        throw new Error(
          `Unrecognized cause "${cause}" in distribution. Valid causes: ${VALID_CAUSES.join(', ')}`
        );
      }
    }

    weightedCauses = [];
    for (const [cause, weight] of Object.entries(causeDistribution)) {
      for (let i = 0; i < weight; i++) {
        weightedCauses.push(cause);
      }
    }
  } else {
    // Uniform distribution across all causes
    weightedCauses = [...VALID_CAUSES];
  }

  const events = [];
  for (let i = 0; i < count; i++) {
    const cause = weightedCauses[Math.floor(Math.random() * weightedCauses.length)];
    events.push(generateEvent(cause));
  }

  return events;
}

export { VALID_CAUSES };
