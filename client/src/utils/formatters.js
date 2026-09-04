/**
 * Formatting utilities for ReRoute Dashboard
 */

/**
 * Format paise or rupee number to INR currency string (e.g. ₹1,499)
 * @param {number} amount
 * @param {boolean} [isPaise=false]
 * @returns {string}
 */
export function formatINR(amount, isPaise = false) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  const val = isPaise ? amount / 100 : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: val % 1 === 0 ? 0 : 2,
  }).format(val);
}

/**
 * Format percentage with 1 or 2 decimals (e.g. 42.5%)
 * @param {number} value
 * @param {number} [decimals=1]
 * @returns {string}
 */
export function formatPercent(value, decimals = 1) {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Format seconds / milliseconds to readable duration (e.g. "1.65s")
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return '0s';
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  return `${Number(seconds).toFixed(2)}s`;
}

/**
 * Format full ISO date string to readable timestamp
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Format relative time (e.g. "5s ago", "2m ago")
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const now = Date.now();
    const past = new Date(dateStr).getTime();
    const diffSec = Math.max(0, Math.floor((now - past) / 1000));

    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  } catch {
    return '—';
  }
}
