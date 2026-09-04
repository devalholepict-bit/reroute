/**
 * Fixed, deterministic demo scenario for ReRoute.
 *
 * Produces exactly these 5 cases and outcomes on every run:
 * 1. ₹14,990, insufficient_funds, returning customer → delayed SMS → paid_immediately (recovered)
 * 2. ₹8,500, card_expired, new customer → card-update email → paid_immediately (recovered)
 * 3. ₹2,000, otp_timeout, returning customer → same-session retry link → paid_immediately (recovered)
 * 4. ₹25,000, mandate_halted, high-value customer → capped retry → promised_to_pay (recovered later via advance-time)
 * 5. ₹7,500, bank_server_timeout, new customer → delayed SMS → no_response (stopped after contact cap)
 */

import crypto from 'crypto';

const uuid = () => crypto.randomUUID();
const razorId = (prefix) => `${prefix}_${crypto.randomBytes(7).toString('hex')}`;

/**
 * Returns the fixed array of 5 demo events with fresh unique IDs and exact deterministic payloads.
 * @returns {Array<object>}
 */
export function getDemoEvents() {
  const now = new Date();

  return [
    // ── Case 1: ₹14,990, insufficient_funds, returning → recovered ──
    {
      id: `evt_${uuid()}`,
      source: 'simulator',
      event: 'payment.failed',
      created_at: new Date(now.getTime() - 4 * 60000).toISOString(),
      forced_outcome: 'paid_immediately',
      payload: {
        payment: {
          id: razorId('pay'),
          order_id: razorId('order'),
          amount: 1499000, // ₹14,990
          currency: 'INR',
          method: 'card',
          status: 'failed',
          error_code: 'BAD_REQUEST_ERROR',
          error_description: 'Your payment could not be completed due to insufficient account balance. Please try with another payment method.',
          error_reason: 'insufficient_funds',
        },
        subscription: {
          id: razorId('sub'),
          status: 'halted',
          retry_count: 1,
        },
        customer: {
          id: 'cust_returning_01',
          contact: '+919820112233',
          email: 'rohan.sharma@gmail.com',
          segment: 'returning',
        },
      },
    },

    // ── Case 2: ₹8,500, card_expired, new → recovered ───────────────
    {
      id: `evt_${uuid()}`,
      source: 'simulator',
      event: 'payment.failed',
      created_at: new Date(now.getTime() - 3 * 60000).toISOString(),
      forced_outcome: 'paid_immediately',
      payload: {
        payment: {
          id: razorId('pay'),
          order_id: razorId('order'),
          amount: 850000, // ₹8,500
          currency: 'INR',
          method: 'card',
          status: 'failed',
          error_code: 'BAD_REQUEST_ERROR',
          error_description: 'The card has expired. Please use a different card or update your card details.',
          error_reason: 'card_expired',
        },
        subscription: {
          id: razorId('sub'),
          status: 'halted',
          retry_count: 0,
        },
        customer: {
          id: 'cust_new_02',
          contact: '+919876543210',
          email: 'priya.patel@yahoo.co.in',
          segment: 'new',
        },
      },
    },

    // ── Case 3: ₹2,000, otp_timeout, returning → recovered ──────────
    {
      id: `evt_${uuid()}`,
      source: 'simulator',
      event: 'payment.failed',
      created_at: new Date(now.getTime() - 2 * 60000).toISOString(),
      forced_outcome: 'paid_immediately',
      payload: {
        payment: {
          id: razorId('pay'),
          order_id: razorId('order'),
          amount: 200000, // ₹2,000
          currency: 'INR',
          method: 'upi',
          status: 'failed',
          error_code: 'BAD_REQUEST_ERROR',
          error_description: 'Payment was not completed as the OTP was not entered in time. Please try again.',
          error_reason: 'otp_timeout',
        },
        subscription: {
          id: razorId('sub'),
          status: 'pending',
          retry_count: 0,
        },
        customer: {
          id: 'cust_returning_03',
          contact: '+919123456789',
          email: 'aarav.mehta@outlook.com',
          segment: 'returning',
        },
      },
    },

    // ── Case 4: ₹25,000, mandate_halted, high-value → promised_to_pay ──
    {
      id: `evt_${uuid()}`,
      source: 'simulator',
      event: 'payment.failed',
      created_at: new Date(now.getTime() - 1 * 60000).toISOString(),
      forced_outcome: 'promised_to_pay',
      payload: {
        payment: {
          id: razorId('pay'),
          order_id: razorId('order'),
          amount: 2500000, // ₹25,000
          currency: 'INR',
          method: 'mandate',
          status: 'failed',
          error_code: 'BAD_REQUEST_ERROR',
          error_description: 'The automated e-mandate deduction exceeded maximum consecutive retries and was halted by issuing bank.',
          error_reason: 'mandate_halted',
        },
        subscription: {
          id: razorId('sub'),
          status: 'halted',
          retry_count: 3,
        },
        customer: {
          id: 'cust_vip_04',
          contact: '+919988776655',
          email: 'vikram.singh@enterprise.in',
          segment: 'high_value',
        },
      },
    },

    // ── Case 5: ₹7,500, bank_server_timeout, new → no_response ─────
    {
      id: `evt_${uuid()}`,
      source: 'simulator',
      event: 'payment.failed',
      created_at: now.toISOString(),
      forced_outcome: 'no_response',
      payload: {
        payment: {
          id: razorId('pay'),
          order_id: razorId('order'),
          amount: 750000, // ₹7,500
          currency: 'INR',
          method: 'netbanking',
          status: 'failed',
          error_code: 'GATEWAY_ERROR',
          error_description: 'The bank server is currently unavailable. Please retry after some time.',
          error_reason: 'bank_server_timeout',
        },
        subscription: {
          id: razorId('sub'),
          status: 'pending',
          retry_count: 2,
        },
        customer: {
          id: 'cust_new_05',
          contact: '+919711223344',
          email: 'neha.verma@hotmail.com',
          segment: 'new',
        },
      },
    },
  ];
}
