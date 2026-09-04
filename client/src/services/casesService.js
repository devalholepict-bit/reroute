/**
 * Frontend Service: Cases API
 */

const API_BASE = '/api/cases';

/**
 * Fetch all cases with optional filters: cause, outcome, status, limit, page
 * @param {object} [filters={}]
 * @returns {Promise<Array<object>>}
 */
export async function fetchCases(filters = {}) {
  const query = new URLSearchParams();
  if (filters.cause) query.set('cause', filters.cause);
  if (filters.outcome) query.set('outcome', filters.outcome);
  if (filters.status) query.set('status', filters.status);
  if (filters.limit) query.set('limit', filters.limit);
  if (filters.page) query.set('page', filters.page);

  const queryString = query.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Failed to fetch cases (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch a single case by ID with full lifecycle timeline:
 * event, diagnosis, recovery_actions, outcomes, promise, audit_logs
 * @param {string} caseId
 * @returns {Promise<object>}
 */
export async function fetchCaseById(caseId) {
  if (!caseId) throw new Error('Case ID is required');
  const res = await fetch(`${API_BASE}/${encodeURIComponent(caseId)}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Failed to fetch case ${caseId} (${res.status})`);
  }
  return res.json();
}
