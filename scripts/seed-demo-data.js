/**
 * Deterministic Demo Seeding Script for ReRoute
 *
 * Reuses the existing Phase 16 deterministic demo scenario and pipeline:
 * 1. ₹14,990, insufficient_funds, returning customer → delayed SMS → paid_immediately (recovered)
 * 2. ₹8,500, card_expired, new customer → card-update email → paid_immediately (recovered)
 * 3. ₹2,000, otp_timeout, returning customer → same-session retry link → paid_immediately (recovered)
 * 4. ₹25,000, mandate_halted, high-value customer → capped retry → promised_to_pay (promise active)
 * 5. ₹7,500, bank_server_timeout, new customer → delayed SMS → no_response (stopped by rule)
 *
 * Reuses:
 * - Existing server/src/controllers/simulator.controller.js (runDemoBatch)
 * - Existing simulator/scenarios/demoScenario.js (Phase 16 deterministic events)
 * - Existing scripts/seed-policies.js (ensures baseline recovery policies exist)
 */

import dotenv from '../server/node_modules/dotenv/lib/main.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server .env BEFORE importing server modules (which assert required env vars)
dotenv.config({ path: path.resolve(__dirname, '..', 'server', '.env') });

import mongoose from '../server/node_modules/mongoose/index.js';
import Policy from '../server/src/models/Policy.model.js';
import { seedPolicies } from './seed-policies.js';
import { runDemoBatch } from '../server/src/controllers/simulator.controller.js';
import { maskMongoUri } from './reset-db.js';

/**
 * Executes the deterministic Phase 16 demo pipeline
 * @returns {Promise<object>} The demo batch result
 */
export async function seedDemoData() {
  const rawUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reroute';
  const maskedUri = maskMongoUri(rawUri);

  console.log('='.repeat(70));
  console.log('  ReRoute Deterministic Demo Seeder (Phase 16)');
  console.log('='.repeat(70));
  console.log(`  Target URI:     ${maskedUri}`);
  console.log('='.repeat(70));

  let shouldDisconnect = false;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(rawUri);
    shouldDisconnect = true;
  }

  // 1. Ensure baseline policies exist before seeding demo events
  let policyCount = await Policy.countDocuments();
  if (policyCount === 0) {
    console.log('\n[seed-demo] No policies found. Seeding default recovery policies...');
    await seedPolicies();
    policyCount = await Policy.countDocuments();
  }
  console.log(`\n[seed-demo] Policy prerequisite verified: ${policyCount} active recovery policies.`);

  // 2. Run the deterministic 5-case demo batch through the full pipeline
  console.log('[seed-demo] Executing Phase 16 deterministic demo batch through pipeline...');

  let batchResult = null;
  const mockReq = { body: {} };
  const mockRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      batchResult = { statusCode: this.statusCode || 200, ...data };
      return this;
    },
  };

  await new Promise((resolve, reject) => {
    runDemoBatch(mockReq, mockRes, (err) => {
      if (err) return reject(err);
      resolve();
    })
      .then(resolve)
      .catch(reject);
  });

  if (!batchResult || !batchResult.success) {
    throw new Error(`Demo batch processing failed: ${JSON.stringify(batchResult)}`);
  }

  const { events = [], recovery_actions = [], outcomes = [] } = batchResult;

  // 3. Print the 5 generated case IDs and their final outcomes
  console.log('\n' + '='.repeat(70));
  console.log('  Demo Batch Seeding Summary');
  console.log('='.repeat(70));

  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    const action = recovery_actions[i];
    const outcome = outcomes[i];
    const amountInr = (evt?.payload?.payment?.amount || 0) / 100;
    const cause = evt?.payload?.payment?.error_reason || 'unknown';
    const segment = evt?.customer?.segment || evt?.payload?.customer?.segment || 'standard';
    const channel = action?.channel || 'none';
    const actionName = action?.action || 'none';
    const finalOutcome = outcome?.outcome || 'unknown';
    const status = evt?.status || 'unknown';

    console.log(
      `\n  Case ${i + 1}:` +
      `\n    - Event ID:       ${evt.id}` +
      `\n    - Customer:       ${evt.customer?.id} (${segment})` +
      `\n    - Amount:         ₹${amountInr.toLocaleString('en-IN')}` +
      `\n    - Failure Cause:  ${cause}` +
      `\n    - Recovery Plan:  ${actionName} via ${channel}` +
      `\n    - Final Outcome:  ${finalOutcome}` +
      `\n    - Event Status:   ${status}`
    );
  }

  console.log('\n' + '-'.repeat(70));
  console.log(`✅  Successfully seeded all ${batchResult.count} deterministic demo cases.`);
  console.log('='.repeat(70) + '\n');

  if (shouldDisconnect) {
    await mongoose.disconnect();
  }

  return batchResult;
}

// Allow direct execution
if (process.argv[1] === __filename) {
  seedDemoData()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ [seed-demo] Error seeding demo data:', err);
      process.exit(1);
    });
}
