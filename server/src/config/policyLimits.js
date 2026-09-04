/**
 * Compliance and policy execution limits.
 *
 * MAX_CONTACT_ATTEMPTS: Max allowed outreach/recovery attempts per customer + payment before hard-stopping.
 * COOLDOWN_HOURS: Minimum required waiting window (hours) between consecutive contact attempts.
 * MANDATE_RETRY_LIMIT: Platform/NPCI specific retry limit for subscription mandates (kept separate from generic cap).
 */

export const MAX_CONTACT_ATTEMPTS = 3;
export const COOLDOWN_HOURS = 6;
export const MANDATE_RETRY_LIMIT = 3;

export default {
  MAX_CONTACT_ATTEMPTS,
  COOLDOWN_HOURS,
  MANDATE_RETRY_LIMIT,
};
