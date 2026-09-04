import mongoose from '../server/node_modules/mongoose/index.js';
import dotenv from '../server/node_modules/dotenv/lib/main.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', 'server', '.env') });

import Policy from '../server/src/models/Policy.model.js';

export const DEFAULT_POLICIES = [
  {
    cause: 'insufficient_funds',
    action: 'delayed_retry',
    timing: 'wait_24_48h',
    channel: 'sms',
    reason_template: 'Low expected success on immediate retry for funds-related declines',
  },
  {
    cause: 'card_expired',
    action: 'customer_update_request',
    timing: 'immediate',
    channel: 'email',
    reason_template: 'Requires customer action before any retry can succeed',
  },
  {
    cause: 'otp_timeout',
    action: 'send_retry_link',
    timing: 'immediate_same_session',
    channel: 'retry_link',
    reason_template: 'Likely a UX drop-off, not a genuine decline',
  },
  {
    cause: 'bank_server_timeout',
    action: 'delayed_retry',
    timing: 'delayed_2h',
    channel: 'sms',
    reason_template: 'Transient infrastructure issue; a short delay often resolves it',
  },
  {
    cause: 'mandate_halted',
    action: 'capped_retry_escalation',
    timing: 'capped_retry_then_promise',
    channel: 'sms_then_prompt',
    reason_template: 'NPCI mandate retry limits apply; escalate to a manual promise after the cap',
  },
  {
    cause: 'generic_decline',
    action: 'low_priority_notification',
    timing: 'immediate_low_priority',
    channel: 'sms',
    reason_template: 'Cause unclear; avoid aggressive contact',
  },
  {
    cause: 'ambiguous_timeout',
    action: 'low_priority_notification',
    timing: 'immediate_low_priority',
    channel: 'sms',
    reason_template: 'Cause unclear; avoid aggressive contact',
  },
];

export async function seedPolicies() {
  console.log('[seed] Seeding recovery policies...');
  for (const pol of DEFAULT_POLICIES) {
    await Policy.findOneAndUpdate(
      { cause: pol.cause },
      pol,
      { upsert: true, new: true }
    );
  }
  const count = await Policy.countDocuments();
  console.log(`[seed] Successfully seeded/updated ${count} policies.`);
}

// Allow direct execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reroute';
  mongoose.connect(mongoUri)
    .then(async () => {
      await seedPolicies();
      await mongoose.disconnect();
      console.log('[seed] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed] Error seeding policies:', err);
      process.exit(1);
    });
}
