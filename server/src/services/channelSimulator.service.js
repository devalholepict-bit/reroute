import { checkAllowed } from './stoppingRules.service.js';
import RecoveryAction from '../models/RecoveryAction.model.js';
import Event from '../models/Event.model.js';
import { logAudit } from './auditLogger.service.js';

/**
 * Message templates keyed by (cause, channel).
 * Each cause produces distinctly worded, realistic recovery copy tailored to the root failure cause.
 */
export const MESSAGE_TEMPLATES = {
  insufficient_funds: {
    sms: (data) =>
      `ReRoute Alert: Your payment of ${data.formattedAmount} failed due to insufficient account balance. ` +
      `We will automatically re-attempt in 24-48 hours, or you can complete payment now: ${data.link}`,
    email: (data) =>
      `Dear ${data.customerName}, your transaction of ${data.formattedAmount} could not be completed ` +
      `due to insufficient balance. Please ensure funds are available or pay via an alternate method: ${data.link}`,
  },
  card_expired: {
    email: (data) =>
      `Action Required: Your card on file has expired for payment of ${data.formattedAmount}. ` +
      `Please update your card details to prevent service disruption: ${data.link}`,
    sms: (data) =>
      `ReRoute: Your card has expired for subscription payment of ${data.formattedAmount}. ` +
      `Update card details here: ${data.link}`,
  },
  otp_timeout: {
    retry_link: (data) =>
      `Session Expired: Your ${data.formattedAmount} checkout timed out during OTP verification. ` +
      `Tap here to instantly resume your session without re-entering details: ${data.link}`,
    sms: (data) =>
      `Payment Verification: Your ${data.formattedAmount} payment was interrupted during OTP entry. ` +
      `Click here to complete payment: ${data.link}`,
  },
  bank_server_timeout: {
    sms: (data) =>
      `Bank Downtime Notice: Your issuing bank is temporarily unavailable for payment of ${data.formattedAmount}. ` +
      `No funds were deducted. We have scheduled an automatic retry in 2 hours.`,
    email: (data) =>
      `Dear ${data.customerName}, a temporary bank server timeout interrupted your payment of ${data.formattedAmount}. ` +
      `Our recovery system will re-attempt this transaction in 2 hours automatically.`,
  },
  mandate_halted: {
    sms_then_prompt: (data) =>
      `Mandate Limit Reached: Recurring debit for ${data.formattedAmount} has reached the platform retry cap. ` +
      `Please confirm your promise to pay or update payment authorization: ${data.link}`,
    sms: (data) =>
      `Auto-Debit Paused: Mandate retry cap reached for ${data.formattedAmount}. ` +
      `Please authorize direct payment: ${data.link}`,
  },
  generic_decline: {
    sms: (data) =>
      `Payment Alert: Your transaction of ${data.formattedAmount} was declined by the bank. ` +
      `Please check with your bank or try an alternate payment method: ${data.link}`,
    email: (data) =>
      `Dear ${data.customerName}, your payment of ${data.formattedAmount} was declined by your bank without specific reason. ` +
      `You can retry with UPI, Netbanking, or another card: ${data.link}`,
  },
  ambiguous_timeout: {
    sms: (data) =>
      `Payment Status Notice: Your transaction of ${data.formattedAmount} timed out at the payment gateway. ` +
      `If debited, it will reflect within 24h, or verify your payment status here: ${data.link}`,
    email: (data) =>
      `Dear ${data.customerName}, we encountered a gateway timeout for your payment of ${data.formattedAmount}. ` +
      `We are confirming status with the payment gateway: ${data.link}`,
  },
};

/**
 * Formats amount from paise to INR currency string.
 */
function formatPaise(amount) {
  if (!amount && amount !== 0) return '₹999';
  const rupees = typeof amount === 'number' && amount >= 1000 ? amount / 100 : amount;
  return `₹${Number(rupees).toLocaleString('en-IN')}`;
}

/**
 * Builds template data payload from Event and RecoveryAction.
 */
function buildTemplateData(event, recoveryAction) {
  const payment = event?.payload?.payment || {};
  const customer = event?.customer || event?.payload?.customer || {};
  const amount = payment.amount || 99900;
  const payId = payment.id || recoveryAction.payment_id || 'pay_unknown';

  return {
    customerName: customer.email ? customer.email.split('@')[0] : 'Customer',
    contact: customer.contact || '',
    amount,
    formattedAmount: formatPaise(amount),
    link: `https://pay.reroute.io/r/${payId}`,
  };
}

/**
 * Generates a realistic simulated message for a specific cause and channel.
 *
 * @param {string} cause
 * @param {string} channel
 * @param {object} templateData
 * @returns {string} The generated message copy
 */
export function generateMessageText(cause, channel, templateData = {}) {
  const causeTemplates = MESSAGE_TEMPLATES[cause] || MESSAGE_TEMPLATES.generic_decline;
  const templateFn =
    causeTemplates[channel] ||
    causeTemplates[Object.keys(causeTemplates)[0]] ||
    MESSAGE_TEMPLATES.generic_decline.sms;

  const data = {
    customerName: templateData.customerName || 'Customer',
    amount: templateData.amount || 99900,
    formattedAmount: templateData.formattedAmount || formatPaise(templateData.amount || 99900),
    link: templateData.link || 'https://pay.reroute.io/r/pay_sample',
    ...templateData,
  };

  return templateFn(data);
}

/**
 * Simulates sending outreach across the chosen channel.
 * Enforces compliance stopping rules prior to execution.
 *
 * @param {object} recoveryAction - The RecoveryAction document/object
 * @param {object} [options={}]
 * @returns {Promise<{ executed: boolean, message?: string, reason?: string, recoveryAction: object }>}
 */
export async function sendSimulated(recoveryAction, options = {}) {
  const eventId = recoveryAction.event_id;
  const customerId = recoveryAction.customer_id;
  const paymentId = recoveryAction.payment_id;

  // Retrieve event if needed for context
  let event = options.event;
  if (!event && eventId) {
    event = await Event.findOne({ id: eventId }).lean();
  }

  const cause = options.cause || event?.payload?.payment?.error_reason || recoveryAction.reason_code || 'generic_decline';
  const isMandate = cause === 'mandate_halted';

  // 1. Check compliance & stopping rules before execution
  const compliance = await checkAllowed(customerId, paymentId, {
    eventId,
    isMandate,
    now: options.now || new Date(),
  });

  if (!compliance.allowed) {
    // Update RecoveryAction status to blocked
    await RecoveryAction.updateOne(
      { _id: recoveryAction._id || recoveryAction.id },
      {
        status: 'blocked',
        block_reason: compliance.reason,
      }
    );

    console.warn(
      `[channel-simulator] BLOCKED execution for event ${eventId} on ${recoveryAction.channel}: ${compliance.reason}`
    );

    return {
      executed: false,
      reason: compliance.reason,
      recoveryAction: {
        ...recoveryAction,
        status: 'blocked',
        block_reason: compliance.reason,
      },
    };
  }

  // 2. Generate simulated message copy
  const templateData = buildTemplateData(event, recoveryAction);
  const message = generateMessageText(cause, recoveryAction.channel, templateData);

  // 3. Mark RecoveryAction as executed
  const executedAt = options.now || new Date();
  await RecoveryAction.updateOne(
    { _id: recoveryAction._id || recoveryAction.id },
    {
      status: 'executed',
      message_sent: message,
      executed_at: executedAt,
    }
  );

  console.log(
    `[channel-simulator] EXECUTED [${recoveryAction.channel.toUpperCase()}] for event ${eventId}:\n` +
    `  "${message}"`
  );

  // Centrally log audit record for executed outreach
  await logAudit({
    customer_id: customerId,
    payment_id: paymentId,
    cause: cause,
    action: recoveryAction.action,
    channel: recoveryAction.channel,
    attempt_number: recoveryAction.attempt_number,
    stopping_rule_status: 'allowed',
    reason: `Outreach sent via ${recoveryAction.channel}: "${message}"`,
  });

  return {
    executed: true,
    channel: recoveryAction.channel,
    action: recoveryAction.action,
    message,
    executed_at: executedAt,
    recoveryAction: {
      ...recoveryAction,
      status: 'executed',
      message_sent: message,
      executed_at: executedAt,
    },
  };
}
