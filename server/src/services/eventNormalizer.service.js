/**
 * Event Normalizer Service
 *
 * Transforms raw payloads from any source (simulator or Razorpay webhook)
 * into a consistent shape matching the Event model schema.
 *
 * Razorpay webhook shape (real):
 *   { event: "payment.failed", payload: { payment: { entity: { id, order_id, amount, ... } } } }
 *
 * Simulator shape:
 *   { id: "evt_...", source: "simulator", event: "payment.failed", payload: { payment: { id, ... }, subscription: {...}, customer: {...} } }
 */

/**
 * Normalize a raw payload into Event-model shape.
 * @param {object} rawPayload — the raw incoming JSON body
 * @param {'simulator'|'razorpay_test'} source
 * @returns {object} normalized object ready for Event.create()
 */
export function normalize(rawPayload, source) {
  if (source === 'simulator') {
    return normalizeSimulator(rawPayload);
  }
  return normalizeRazorpay(rawPayload);
}

/**
 * Simulator events already match our schema closely — just map fields.
 */
function normalizeSimulator(raw) {
  const payment = raw.payload?.payment || {};
  const customer = raw.payload?.customer || {};
  const subscription = raw.payload?.subscription || {};

  return {
    id: raw.id,
    source: 'simulator',
    event: raw.event,
    status: 'pending_diagnosis',
    payload: {
      payment: {
        id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        error_code: payment.error_code,
        error_description: payment.error_description,
        error_reason: payment.error_reason,
      },
      subscription: {
        id: subscription.id,
        status: subscription.status,
        retry_count: subscription.retry_count,
      },
      customer: {
        id: customer.id,
        contact: customer.contact,
        email: customer.email,
        segment: customer.segment,
      },
    },
    raw_payload: raw,
    customer: {
      id: customer.id,
      contact: customer.contact,
      email: customer.email,
      segment: customer.segment,
    },
    created_at: raw.created_at ? new Date(raw.created_at) : new Date(),
  };
}

/**
 * Razorpay real webhooks nest payment data under payload.payment.entity.
 * We flatten it to match our schema.
 */
function normalizeRazorpay(raw) {
  // Razorpay wraps in: { entity: "event", event: "payment.failed", payload: { payment: { entity: {...} } } }
  const paymentEntity = raw.payload?.payment?.entity || {};
  const customerData = paymentEntity.customer || paymentEntity.notes?.customer || {};

  // Razorpay provides an event-level account_id; we use the payment id for event id
  const eventId = raw.id || `rzp_evt_${paymentEntity.id || Date.now()}`;

  return {
    id: eventId,
    source: 'razorpay_test',
    event: raw.event || 'unknown',
    status: 'pending_diagnosis',
    payload: {
      payment: {
        id: paymentEntity.id,
        order_id: paymentEntity.order_id,
        amount: paymentEntity.amount,
        currency: paymentEntity.currency,
        method: paymentEntity.method,
        status: paymentEntity.status,
        error_code: paymentEntity.error_code,
        error_description: paymentEntity.error_description,
        error_reason: paymentEntity.error_reason,
      },
      subscription: {
        id: paymentEntity.subscription_id || null,
        status: null,
        retry_count: null,
      },
      customer: {
        id: customerData.id || null,
        contact: paymentEntity.contact || customerData.contact || null,
        email: paymentEntity.email || customerData.email || null,
        segment: null, // Razorpay doesn't provide segment
      },
    },
    raw_payload: raw,
    customer: {
      id: customerData.id || null,
      contact: paymentEntity.contact || customerData.contact || null,
      email: paymentEntity.email || customerData.email || null,
      segment: null,
    },
    created_at: raw.created_at
      ? new Date(raw.created_at * 1000) // Razorpay sends Unix timestamp
      : new Date(),
  };
}
