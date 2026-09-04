/**
 * Frontend Service: Simulator API
 *
 * NOTE: The X-Dev-Secret header uses a shared development secret (VITE_SIMULATOR_DEV_SECRET)
 * for hackathon demo scoping, not a cryptographic authentication boundary.
 */

const API_BASE = '/api/simulator';
const DEV_SECRET = import.meta.env.VITE_SIMULATOR_DEV_SECRET || 'dev_secret_reroute_2026';

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Dev-Secret': DEV_SECRET,
  };
}

/**
 * Run demo batch (5 cases across distinct causes)
 * @param {number} [count=5]
 * @returns {Promise<object>}
 */
export async function runDemoBatch(count = 5) {
  const res = await fetch(`${API_BASE}/run`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ count }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Failed to run demo batch (${res.status})`);
  }
  return res.json();
}

/**
 * Trigger random simulator batch
 * @param {object} params
 * @param {number} [params.count=5]
 * @param {string} [params.cause]
 * @param {boolean} [params.full=true]
 * @returns {Promise<object>}
 */
export async function triggerSimulatorBatch({ count = 5, cause = '', full = true } = {}) {
  const endpoint = full ? `${API_BASE}/events/full` : `${API_BASE}/events`;
  const body = { count: Number(count) || 5 };
  if (cause) body.cause = cause;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Failed to trigger simulator events (${res.status})`);
  }
  return res.json();
}

