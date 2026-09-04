import { describe, it, expect } from '@jest/globals';
import { maskPhone, maskEmail, redactCustomer, redactPayload } from '../../src/utils/logger.js';

describe('Unit: Logger & PII Redaction Utilities', () => {
  describe('maskPhone', () => {
    it('masks Indian phone numbers preserving country code and last 4 digits', () => {
      expect(maskPhone('+919876543210')).toBe('+91XXXXXX3210');
      expect(maskPhone('9876543210')).toBe('XXXXXX3210');
    });

    it('handles short or non-standard phone numbers safely', () => {
      expect(maskPhone('1234')).toBe('****');
      expect(maskPhone('')).toBe('');
      expect(maskPhone(null)).toBe('');
      expect(maskPhone(undefined)).toBe('');
    });
  });

  describe('maskEmail', () => {
    it('masks standard email addresses preserving domain and outer characters', () => {
      expect(maskEmail('rahul.sharma@example.com')).toBe('r***a@example.com');
      expect(maskEmail('john@domain.co.in')).toBe('j***n@domain.co.in');
    });

    it('handles short or malformed email strings gracefully', () => {
      expect(maskEmail('ab@domain.com')).toBe('a***@domain.com');
      expect(maskEmail('invalid-email')).toBe('***');
      expect(maskEmail('')).toBe('');
      expect(maskEmail(null)).toBe('');
    });
  });

  describe('redactCustomer', () => {
    it('masks contact and email inside customer objects', () => {
      const customer = {
        id: 'cust_123',
        name: 'Rahul Sharma',
        contact: '+919876543210',
        email: 'rahul.sharma@example.com',
      };

      const redacted = redactCustomer(customer);
      expect(redacted.id).toBe('cust_123');
      expect(redacted.name).toBe('Rahul Sharma');
      expect(redacted.contact).toBe('+91XXXXXX3210');
      expect(redacted.email).toBe('r***a@example.com');
    });
  });

  describe('redactPayload', () => {
    it('recursively redacts PII in nested JSON payload structures', () => {
      const payload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_123',
              contact: '+919876543210',
              email: 'rahul.sharma@example.com',
              customer: {
                contact: '+919999999999',
                email: 'customer@test.com',
              },
            },
          },
        },
      };

      const redacted = redactPayload(payload);
      expect(redacted.payload.payment.entity.id).toBe('pay_123');
      expect(redacted.payload.payment.entity.contact).toBe('+91XXXXXX3210');
      expect(redacted.payload.payment.entity.email).toBe('r***a@example.com');
      expect(redacted.payload.payment.entity.customer.contact).toBe('+91XXXXXX9999');
      expect(redacted.payload.payment.entity.customer.email).toBe('c***r@test.com');
    });
  });
});
