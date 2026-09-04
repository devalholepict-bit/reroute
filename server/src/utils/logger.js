/**
 * Logger & PII Redaction Utilities
 *
 * Masks customer identifiers (email, phone/contact) in logs and payloads
 * to prevent sensitive PII leakage.
 */

/**
 * Masks a phone number retaining any country code prefix and the last 4 digits.
 * Example: "+919876543210" -> "+91XXXXXX3210", "9876543210" -> "XXXXXX3210"
 *
 * @param {string} phone
 * @returns {string}
 */
export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return '*'.repeat(trimmed.length);

  let prefix = '';
  let body = trimmed;

  if (trimmed.startsWith('+91')) {
    prefix = '+91';
    body = trimmed.slice(3);
  } else if (trimmed.startsWith('+')) {
    if (trimmed.length > 10) {
      prefix = trimmed.slice(0, trimmed.length - 10);
      body = trimmed.slice(-10);
    } else {
      prefix = '+';
      body = trimmed.slice(1);
    }
  }

  if (body.length <= 4) {
    return `${prefix}${'*'.repeat(body.length - 1)}${body.slice(-1)}`;
  }

  const last4 = body.slice(-4);
  const maskedMiddle = 'X'.repeat(body.length - 4);
  return `${prefix}${maskedMiddle}${last4}`;
}


/**
 * Masks an email address preserving the first letter, last letter before @, and domain.
 * Example: "rahul.sharma@example.com" -> "r***a@example.com", "a@b.com" -> "a***@b.com"
 *
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return '***';

  const user = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);

  if (user.length <= 2) {
    return `${user[0]}***${domain}`;
  }

  return `${user[0]}***${user[user.length - 1]}${domain}`;
}

/**
 * Returns a shallow-redacted customer object.
 *
 * @param {object} customer
 * @returns {object}
 */
export function redactCustomer(customer) {
  if (!customer || typeof customer !== 'object') return customer;
  return {
    ...customer,
    ...(customer.contact && { contact: maskPhone(customer.contact) }),
    ...(customer.email && { email: maskEmail(customer.email) }),
  };
}

/**
 * Deeply clones and masks PII fields in a payload object.
 *
 * @param {object} payload
 * @returns {object}
 */
export function redactPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  try {
    const copy = JSON.parse(JSON.stringify(payload));
    const walk = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (key === 'contact' || key === 'phone' || key === 'customer_contact') {
          if (typeof obj[key] === 'string') obj[key] = maskPhone(obj[key]);
        } else if (key === 'email' || key === 'customer_email') {
          if (typeof obj[key] === 'string') obj[key] = maskEmail(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          walk(obj[key]);
        }
      }
    };
    walk(copy);
    return copy;
  } catch (_e) {
    return { redacted: true };
  }
}
