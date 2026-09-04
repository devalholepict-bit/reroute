/**
 * Constants & metadata for ReRoute Dashboard
 * Adheres strictly to the 5-color fintech design system:
 * - Emerald: Recovered / positive / allowed
 * - Amber: Pending / promised / at-risk
 * - Rose: Failed / blocked / stopped
 * - Sky: Live dispatch / infrastructure
 * - Slate: Neutral / base
 */

export const CAUSES = [
  'insufficient_funds',
  'card_expired',
  'bank_server_timeout',
  'otp_timeout',
  'generic_decline',
  'ambiguous_timeout',
  'mandate_halted',
];

export const CAUSE_LABELS = {
  insufficient_funds: 'Insufficient Funds',
  card_expired: 'Card Expired',
  bank_server_timeout: 'Bank Server Timeout',
  otp_timeout: 'OTP Timeout',
  generic_decline: 'Generic Decline',
  ambiguous_timeout: 'Ambiguous Timeout',
  mandate_halted: 'Mandate Halted',
};

export const CAUSE_COLORS = {
  insufficient_funds: {
    bg: 'bg-amber-50',
    border: 'border-amber-200/80',
    text: 'text-amber-800',
    hex: '#d97706',
  },
  card_expired: {
    bg: 'bg-rose-50',
    border: 'border-rose-200/80',
    text: 'text-rose-800',
    hex: '#e11d48',
  },
  bank_server_timeout: {
    bg: 'bg-sky-50',
    border: 'border-sky-200/80',
    text: 'text-sky-800',
    hex: '#0284c7',
  },
  otp_timeout: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200/80',
    text: 'text-emerald-800',
    hex: '#059669',
  },
  generic_decline: {
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-700',
    hex: '#64748b',
  },
  ambiguous_timeout: {
    bg: 'bg-amber-50',
    border: 'border-amber-200/80',
    text: 'text-amber-800',
    hex: '#d97706',
  },
  mandate_halted: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200/80',
    text: 'text-emerald-800',
    hex: '#059669',
  },
};

export const OUTCOMES = [
  'paid_immediately',
  'promised_to_pay',
  'no_response',
  'failed_again',
];

export const OUTCOME_LABELS = {
  paid_immediately: 'Paid Immediately',
  promised_to_pay: 'Promised to Pay',
  no_response: 'No Response',
  failed_again: 'Failed Again',
};

export const OUTCOME_COLORS = {
  paid_immediately: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200/80',
    text: 'text-emerald-800',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  promised_to_pay: {
    bg: 'bg-amber-50',
    border: 'border-amber-200/80',
    text: 'text-amber-800',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  no_response: {
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  failed_again: {
    bg: 'bg-rose-50',
    border: 'border-rose-200/80',
    text: 'text-rose-800',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

export const STATUS_COLORS = {
  pending_diagnosis: 'bg-amber-50 text-amber-800 border-amber-200',
  diagnosed: 'bg-sky-50 text-sky-800 border-sky-200',
  policy_applied: 'bg-slate-100 text-slate-700 border-slate-200',
  executed: 'bg-sky-50 text-sky-800 border-sky-200',
  resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export const CHANNEL_ICONS = {
  sms: '📱 SMS',
  email: '✉️ Email',
  whatsapp: '💬 WhatsApp',
  retry_link: '🔗 Payment Link',
  sms_then_prompt: '📲 SMS + In-App',
  in_app: '🔔 In-App',
};

export const POLLING_INTERVAL_MS = 2500;

