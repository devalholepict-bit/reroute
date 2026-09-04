import AuditLog from '../models/AuditLog.model.js';

/**
 * Centrally creates and persists an AuditLog document.
 * This is the ONLY place AuditLog documents are created in the entire application.
 *
 * @param {object} entry - Audit log fields
 * @param {Date|string} [entry.timestamp]
 * @param {string} [entry.customer_id]
 * @param {string} [entry.payment_id]
 * @param {string} [entry.cause]
 * @param {number} [entry.confidence]
 * @param {string} [entry.policy]
 * @param {string} [entry.action]
 * @param {string} [entry.channel]
 * @param {number} [entry.attempt_number]
 * @param {string} [entry.outcome]
 * @param {string} [entry.reason]
 * @param {string} [entry.stopping_rule_status]
 * @param {Date|string} [entry.created_at]
 * @returns {Promise<object|null>} The created AuditLog document or null on failure
 */
export async function logAudit(entry = {}) {
  try {
    const logDoc = {
      timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
      customer_id: entry.customer_id || null,
      payment_id: entry.payment_id || null,
      cause: entry.cause || null,
      confidence: typeof entry.confidence === 'number' ? entry.confidence : null,
      policy: entry.policy || null,
      action: entry.action || null,
      channel: entry.channel || null,
      attempt_number: typeof entry.attempt_number === 'number' ? entry.attempt_number : null,
      outcome: entry.outcome || null,
      reason: entry.reason || null,
      stopping_rule_status: entry.stopping_rule_status || null,
      created_at: entry.created_at ? new Date(entry.created_at) : new Date(),
    };

    const record = await AuditLog.create(logDoc);
    return record.toObject();
  } catch (err) {
    console.error('[auditLogger] Failed to persist audit log:', err.message);
    return null;
  }
}
