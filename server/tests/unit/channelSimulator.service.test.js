import { describe, it, expect } from '@jest/globals';
import { generateMessageText, MESSAGE_TEMPLATES } from '../../src/services/channelSimulator.service.js';

describe('channelSimulator.service', () => {
  const sampleData = {
    customerName: 'Aarav',
    formattedAmount: '₹14,990',
    link: 'https://pay.reroute.io/r/pay_sample123',
  };

  it('generates distinctly worded message text for different (cause, channel) pairs', () => {
    const msgInsufficientFundsSms = generateMessageText('insufficient_funds', 'sms', sampleData);
    const msgCardExpiredEmail = generateMessageText('card_expired', 'email', sampleData);
    const msgOtpTimeoutRetry = generateMessageText('otp_timeout', 'retry_link', sampleData);
    const msgBankTimeoutSms = generateMessageText('bank_server_timeout', 'sms', sampleData);
    const msgMandateHalted = generateMessageText('mandate_halted', 'sms_then_prompt', sampleData);

    // Assert all generated messages are non-empty strings
    expect(msgInsufficientFundsSms).toBeTruthy();
    expect(msgCardExpiredEmail).toBeTruthy();
    expect(msgOtpTimeoutRetry).toBeTruthy();
    expect(msgBankTimeoutSms).toBeTruthy();
    expect(msgMandateHalted).toBeTruthy();

    // Assert distinct cause/channel combinations are NOT string-identical
    expect(msgInsufficientFundsSms).not.toBe(msgCardExpiredEmail);
    expect(msgInsufficientFundsSms).not.toBe(msgOtpTimeoutRetry);
    expect(msgCardExpiredEmail).not.toBe(msgOtpTimeoutRetry);
    expect(msgBankTimeoutSms).not.toBe(msgMandateHalted);
    expect(msgBankTimeoutSms).not.toBe(msgInsufficientFundsSms);

    // Assert tailored keyword content
    expect(msgInsufficientFundsSms).toContain('insufficient');
    expect(msgCardExpiredEmail).toContain('expired');
    expect(msgOtpTimeoutRetry).toContain('OTP');
    expect(msgBankTimeoutSms).toContain('Bank');
    expect(msgMandateHalted).toContain('Mandate');
  });

  it('falls back to generic_decline templates for unrecognized cause', () => {
    const fallbackMsg = generateMessageText('unknown_cause_xyz', 'sms', sampleData);
    expect(fallbackMsg).toContain('declined');
  });
});
