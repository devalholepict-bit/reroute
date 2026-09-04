/**
 * Frontend Service: Metrics API
 */

const API_BASE = '/api/metrics';

/**
 * Fetch real-time executive recovery metrics computed via MongoDB aggregations:
 * - overall_recovery_rate (%)
 * - recovery_rate_by_cause (cause breakdown)
 * - total_amount_recovered (rupees & paise)
 * - average_time_to_recovery (seconds & ms)
 * - contact_cap_compliance_rate (%)
 * - promise_to_paid_conversion_rate (%)
 * - summary counts
 *
 * @returns {Promise<object>}
 */
export async function fetchMetrics() {
  const res = await fetch(API_BASE);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Failed to fetch metrics (${res.status})`);
  }
  return res.json();
}
