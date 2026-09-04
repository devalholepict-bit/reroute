/**
 * Shared Chart Theme & Color System for ReRoute Dashboard
 *
 * Strict 5-color fintech ops palette on light neutral stage:
 * - Slate/Ink (structural base & neutral text)
 * - Emerald (recovered / positive)
 * - Amber (pending / promised / at-risk)
 * - Rose (failed / blocked / stopped)
 * - Sky (live dispatch / infrastructure)
 */

export const CHART_COLORS = {
  emerald: '#059669', // recovered / positive
  amber: '#d97706',   // promised / pending / at-risk
  rose: '#e11d48',    // failed / stopped / blocked
  slate: '#64748b',   // neutral
  sky: '#0284c7',     // active dispatch
  darkBg: '#ffffff',
  cardBg: '#ffffff',
  border: '#e2e8f0',
  textMuted: '#64748b',
  textLight: '#0f172a',
};

export const CAUSE_CHART_COLORS = {
  insufficient_funds: '#d97706',  // amber (funds awaiting deposit)
  card_expired: '#e11d48',        // rose (requires card replacement)
  bank_server_timeout: '#0284c7', // sky/blue (infrastructure transient)
  otp_timeout: '#059669',         // emerald (high-probability immediate retry)
  generic_decline: '#64748b',     // slate (unclear cause)
  ambiguous_timeout: '#d97706',   // amber (mixed signals)
  mandate_halted: '#059669',      // emerald (recoverable via promise)
};

export const OUTCOME_CHART_COLORS = {
  paid_immediately: '#059669',
  promised_to_pay: '#d97706',
  no_response: '#64748b',
  failed_again: '#e11d48',
};

