/**
 * Frontend Service: Promises API
 *
 * NOTE: The X-Dev-Secret header uses a shared development secret (VITE_SIMULATOR_DEV_SECRET)
 * for hackathon demo scoping, not a cryptographic authentication boundary.
 */

const API_BASE = '/api/promises';
const DEV_SECRET = import.meta.env.VITE_SIMULATOR_DEV_SECRET || 'dev_secret_reroute_2026';

/**
 * List all promises-to-pay
 * @returns {Promise<Array<object>>}
 */
export async function fetchPromises() {
  const res = await fetch(API_BASE);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Failed to fetch promises (${res.status})`);
  }
  return res.json();
}

/**
 * Advance time and resolve a pending promise-to-pay on demand
 * @param {string} caseId
 * @param {object} [options={}]
 * @param {('fulfilled'|'missed')} [options.forceStatus]
 * @returns {Promise<object>}
 */
export async function advancePromiseTime(caseId, options = {}) {
  if (!caseId) throw new Error('Case ID is required to advance promise time');
  const body = { caseId };
  if (options.forceStatus) body.forceStatus = options.forceStatus;

  const res = await fetch(`${API_BASE}/advance-time`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Dev-Secret': DEV_SECRET,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Failed to advance time for case ${caseId} (${res.status})`);
  }
  return res.json();
}

