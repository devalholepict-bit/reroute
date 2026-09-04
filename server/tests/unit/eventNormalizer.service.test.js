import { describe, it, expect } from '@jest/globals';
import { normalize } from '../../src/services/eventNormalizer.service.js';

describe('eventNormalizer.service', () => {
  it('normalizes real Razorpay-shaped payloads correctly into Event schema', () => {
    const razorpayPayload = {
      id: 'rzp_event_998877',
      event: 'payment.failed',
      created_at: 1700000000, // Unix timestamp in seconds
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_12345',
            order_id: 'order_rzp_67890',
            amount: 149900,
            currency: 'INR',
            method: 'card',
            status: 'failed',
            error_code: 'BAD_REQUEST_ERROR',
            error_description: 'Card declined by issuing bank',
            error_reason: 'card_expired',
            subscription_id: 'sub_123',
            email: 'customer@razorpay.test',
            contact: '+919999888877',
          },
        },
      },
    };

    const result = normalize(razorpayPayload, 'razorpay_test');

    expect(result.id).toBe('rzp_event_998877');
    expect(result.source).toBe('razorpay_test');
    expect(result.event).toBe('payment.failed');
    expect(result.status).toBe('pending_diagnosis');

    // Payment fields extracted from entity
    expect(result.payload.payment.id).toBe('pay_rzp_12345');
    expect(result.payload.payment.order_id).toBe('order_rzp_67890');
    expect(result.payload.payment.amount).toBe(149900);
    expect(result.payload.payment.currency).toBe('INR');
    expect(result.payload.payment.method).toBe('card');
    expect(result.payload.payment.error_code).toBe('BAD_REQUEST_ERROR');
    expect(result.payload.payment.error_reason).toBe('card_expired');

    // Customer fields
    expect(result.customer.email).toBe('customer@razorpay.test');
    expect(result.customer.contact).toBe('+919999888877');

    // Subscription
    expect(result.payload.subscription.id).toBe('sub_123');

    // Date
    expect(result.created_at).toEqual(new Date(1700000000 * 1000));
    expect(result.raw_payload).toEqual(razorpayPayload);
  });

  it('normalizes simulator-shaped payloads correctly into Event schema', () => {
    const simPayload = {
      id: 'evt_sim_112233',
      source: 'simulator',
      event: 'payment.failed',
      created_at: '2026-08-30T10:15:30.000Z',
      payload: {
        payment: {
          id: 'pay_sim_4455',
          order_id: 'order_sim_6677',
          amount: 2500000,
          currency: 'INR',
          method: 'mandate',
          status: 'failed',
          error_code: 'BAD_REQUEST_ERROR',
          error_description: 'E-mandate retry cap exceeded',
          error_reason: 'mandate_halted',
        },
        subscription: {
          id: 'sub_sim_8899',
          status: 'halted',
          retry_count: 3,
        },
        customer: {
          id: 'cust_sim_01',
          contact: '+919876543210',
          email: 'sim.customer@example.com',
          segment: 'high_value',
        },
      },
    };

    const result = normalize(simPayload, 'simulator');

    expect(result.id).toBe('evt_sim_112233');
    expect(result.source).toBe('simulator');
    expect(result.event).toBe('payment.failed');
    expect(result.status).toBe('pending_diagnosis');

    expect(result.payload.payment.id).toBe('pay_sim_4455');
    expect(result.payload.payment.amount).toBe(2500000);
    expect(result.payload.payment.error_reason).toBe('mandate_halted');

    expect(result.payload.subscription.id).toBe('sub_sim_8899');
    expect(result.payload.subscription.status).toBe('halted');
    expect(result.payload.subscription.retry_count).toBe(3);

    expect(result.customer.id).toBe('cust_sim_01');
    expect(result.customer.segment).toBe('high_value');
    expect(result.customer.email).toBe('sim.customer@example.com');
  });
});
