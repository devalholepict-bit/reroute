/**
 * Frontend Service: Audit API
 */

const API_BASE = '/api/audit';

/**
 * Fetch audit logs with optional filters: cause, outcome, from, to, payment_id, customer_id, limit
 * @param {object} [filters={}]
 * @returns {Promise<Array<object>>}
 */
export async function fetchAuditLogs(filters = {}) {
  const query = new URLSearchParams();
  if (filters.cause) query.set('cause', filters.cause);
  if (filters.outcome) query.set('outcome', filters.outcome);
  if (filters.payment_id) query.set('payment_id', filters.payment_id);
  if (filters.customer_id) query.set('customer_id', filters.customer_id);
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  if (filters.limit) query.set('limit', filters.limit);

  const queryString = query.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Failed to fetch audit logs (${res.status})`);
  }
  return res.json();
}
