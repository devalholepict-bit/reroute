/**
 * Event templates for Razorpay-shaped simulator events.
 * Each template produces an event matching the exact schema required by the system.
 */

import crypto from 'crypto';

// ─── Helpers ────────────────────────────────────────────────────────────────

const uuid = () => crypto.randomUUID();
const razorId = (prefix) => `${prefix}_${crypto.randomBytes(7).toString('hex')}`;
const phoneDigits = () => String(Math.floor(7000000000 + Math.random() * 3000000000));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const coinFlip = () => Math.random() > 0.5;

const SEGMENTS = ['new', 'returning', 'churned', 'high_value'];
const METHODS = ['card', 'upi', 'netbanking', 'wallet'];
const CURRENCIES = ['INR'];

const DOMAINS = ['gmail.com', 'yahoo.co.in', 'outlook.com', 'hotmail.com', 'protonmail.com'];
const FIRST_NAMES = ['aarav', 'diya', 'rohan', 'priya', 'arjun', 'meera', 'karan', 'ananya', 'vikram', 'neha'];

function randomEmail() {
  return `${pick(FIRST_NAMES)}${Math.floor(Math.random() * 999)}@${pick(DOMAINS)}`;
}

function baseEvent(eventType) {
  return {
    id: `evt_${uuid()}`,
    source: 'simulator',
    event: eventType,
    created_at: new Date().toISOString(),
  };
}

function basePayment(overrides = {}) {
  return {
    id: razorId('pay'),
    order_id: razorId('order'),
    amount: pick([49900, 99900, 149900, 199900, 299900, 499900]),
    currency: pick(CURRENCIES),
    method: pick(METHODS),
    status: 'failed',
    ...overrides,
  };
}

function baseSubscription(overrides = {}) {
  return {
    id: razorId('sub'),
    status: pick(['halted', 'pending']),
    retry_count: Math.floor(Math.random() * 5),
    ...overrides,
  };
}

function baseCustomer(overrides = {}) {
  return {
    id: razorId('cust'),
    contact: `+91${phoneDigits()}`,
    email: randomEmail(),
    segment: pick(SEGMENTS),
    ...overrides,
  };
}

// ─── Cause-specific templates ───────────────────────────────────────────────

const TEMPLATES = {
  insufficient_funds: (eventType) => ({
    ...baseEvent(eventType),
    payload: {
      payment: basePayment({
        method: 'card',
        error_code: 'BAD_REQUEST_ERROR',
        error_description: 'Your payment could not be completed due to insufficient account balance. Please try with another payment method.',
        error_reason: 'insufficient_funds',
      }),
      subscription: baseSubscription({ status: 'halted', retry_count: pick([1, 2, 3]) }),
      customer: baseCustomer({ segment: pick(['returning', 'high_value']) }),
    },
  }),

  card_expired: (eventType) => ({
    ...baseEvent(eventType),
    payload: {
      payment: basePayment({
        method: 'card',
        error_code: 'BAD_REQUEST_ERROR',
        error_description: 'The card has expired. Please use a different card or update your card details.',
        error_reason: 'card_expired',
      }),
      subscription: baseSubscription({ status: 'halted', retry_count: pick([0, 1]) }),
      customer: baseCustomer({ segment: pick(['returning', 'churned']) }),
    },
  }),

  bank_server_timeout: (eventType) => ({
    ...baseEvent(eventType),
    payload: {
      payment: basePayment({
        method: pick(['netbanking', 'card']),
        error_code: 'GATEWAY_ERROR',
        error_description: 'The bank server is currently unavailable. Please retry after some time.',
        error_reason: 'bank_server_timeout',
      }),
      subscription: baseSubscription({ status: 'pending', retry_count: pick([0, 1, 2]) }),
      customer: baseCustomer(),
    },
  }),

  otp_timeout: (eventType) => ({
    ...baseEvent(eventType),
    payload: {
      payment: basePayment({
        method: pick(['card', 'netbanking']),
        error_code: 'BAD_REQUEST_ERROR',
        error_description: 'Payment was not completed as the OTP was not entered in time. Please try again.',
        error_reason: 'otp_timeout',
      }),
      subscription: baseSubscription({ status: 'pending', retry_count: 0 }),
      customer: baseCustomer({ segment: pick(['new', 'returning']) }),
    },
  }),

  generic_decline: (eventType) => ({
    ...baseEvent(eventType),
    payload: {
      payment: basePayment({
        method: pick(['card', 'upi']),
        error_code: 'BAD_REQUEST_ERROR',
        error_description: 'The payment was declined by the issuing bank. No further information was provided.',
        error_reason: 'generic_decline',
      }),
      subscription: baseSubscription({ status: 'halted', retry_count: pick([1, 2, 3, 4]) }),
      customer: baseCustomer(),
    },
  }),

  /**
   * ambiguous_timeout — intentionally blends features from other cause types
   * so it doesn't cleanly separate from bank_server_timeout, otp_timeout, etc.
   */
  ambiguous_timeout: (eventType) => {
    // Randomly borrow error descriptions and codes from neighboring causes
    const errorDescriptions = [
      'The transaction timed out. Please retry.',
      'Payment could not be processed due to a timeout at the payment gateway.',
      'The bank did not respond in time. This could be a temporary issue.',
      'The payment was not completed in time. The reason could not be determined.',
      'Transaction timed out — unable to confirm whether the OTP was received.',
    ];
    const errorReasons = [
      'timeout',
      'gateway_timeout',
      'bank_server_timeout',   // deliberately reuses another cause's reason
      'otp_timeout',           // deliberately reuses another cause's reason
      'unknown_timeout',
    ];
    const errorCodes = coinFlip() ? 'GATEWAY_ERROR' : 'BAD_REQUEST_ERROR';

    // Vary method to overlap with both bank_server and otp scenarios
    const method = pick(['card', 'netbanking', 'upi']);
    const retryCount = pick([0, 1, 2, 3]);
    const subStatus = pick(['halted', 'pending']);
    const segment = pick(SEGMENTS);

    return {
      ...baseEvent(eventType),
      payload: {
        payment: basePayment({
          method,
          error_code: errorCodes,
          error_description: pick(errorDescriptions),
          error_reason: pick(errorReasons),
        }),
        subscription: baseSubscription({ status: subStatus, retry_count: retryCount }),
        customer: baseCustomer({ segment }),
      },
    };
  },
};

export const VALID_CAUSES = Object.keys(TEMPLATES);
export default TEMPLATES;
