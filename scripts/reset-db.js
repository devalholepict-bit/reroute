/**
 * Database Reset Script for ReRoute
 *
 * Resets ONLY transactional and operational collections for clean demo runs:
 * - events
 * - diagnoses
 * - recoveryactions
 * - outcomes
 * - promises
 * - auditlogs
 * - auditevents
 *
 * SAFETY GUARDS:
 * 1. Explicitly PROTECTS the 'policies' collection (never deletes policies).
 * 2. Requires explicit confirmation: RESET_CONFIRM=true or --confirm flag.
 * 3. Does not run destructive reset when imported as a module.
 * 4. Masks credentials and clearly displays the target database before executing.
 */

import mongoose from '../server/node_modules/mongoose/index.js';
import dotenv from '../server/node_modules/dotenv/lib/main.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server .env
dotenv.config({ path: path.resolve(__dirname, '..', 'server', '.env') });

import Policy from '../server/src/models/Policy.model.js';
import { seedPolicies } from './seed-policies.js';

// Strict list of collections that are safe to clear
export const TRANSACTIONAL_COLLECTIONS = [
  'events',
  'diagnoses',
  'recoveryactions',
  'outcomes',
  'promises',
  'auditlogs',
  'auditevents',
];

// Collections that must NEVER be deleted
export const PROTECTED_COLLECTIONS = ['policies'];

/**
 * Mask sensitive credentials in MongoDB URI for safe console logging
 */
export function maskMongoUri(uri) {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

/**
 * Main database reset function
 * @param {object} options
 * @param {boolean} [options.confirm] - Whether confirmation flag was provided
 * @returns {Promise<object>} Summary of reset operations
 */
export async function resetDatabase(options = {}) {
  const isConfirmed =
    options.confirm === true ||
    process.env.RESET_CONFIRM === 'true' ||
    process.argv.includes('--confirm') ||
    process.argv.includes('-y');

  const rawUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reroute';
  const maskedUri = maskMongoUri(rawUri);
  const nodeEnv = process.env.NODE_ENV || 'development';

  console.log('='.repeat(70));
  console.log('  ReRoute Database Reset Tool');
  console.log('='.repeat(70));
  console.log(`  Target URI:         ${maskedUri}`);
  console.log(`  Environment:        ${nodeEnv}`);
  console.log(`  Protected Data:     'policies' collection (will NEVER be deleted)`);
  console.log('='.repeat(70));

  if (!isConfirmed) {
    console.log('\n⚠️  SAFETY GUARD ACTIVATED:');
    console.log('   Destructive reset was NOT executed because explicit confirmation was not provided.');
    console.log('\n   To execute reset, run with explicit confirmation:');
    console.log('     RESET_CONFIRM=true node scripts/reset-db.js');
    console.log('   OR:');
    console.log('     node scripts/reset-db.js --confirm\n');
    console.log('='.repeat(70));
    return {
      success: false,
      reason: 'confirmation_required',
      collectionsCleared: [],
      policiesPreserved: true,
    };
  }

  // Connect to DB
  let shouldDisconnect = false;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(rawUri);
    shouldDisconnect = true;
  }

  const db = mongoose.connection.db;
  const dbName = mongoose.connection.name || 'default';
  console.log(`\n[reset] Connected to database: "${dbName}"`);

  // 1. Check policies count before reset
  let policiesBefore = 0;
  try {
    policiesBefore = await Policy.countDocuments();
  } catch {
    policiesBefore = 0;
  }

  // 2. Fetch all collections in DB and measure counts before deletion
  const summary = [];
  const existingCollections = (await db.listCollections().toArray()).map((c) => c.name);

  console.log('\n[reset] Performing safe reset of transactional collections...');

  for (const collName of TRANSACTIONAL_COLLECTIONS) {
    if (PROTECTED_COLLECTIONS.includes(collName)) {
      throw new Error(`CRITICAL INVARIANT VIOLATION: Refusing to delete protected collection "${collName}"`);
    }

    let beforeCount = 0;
    if (existingCollections.includes(collName)) {
      beforeCount = await db.collection(collName).countDocuments();
      if (beforeCount > 0) {
        await db.collection(collName).deleteMany({});
      }
    }

    const afterCount = existingCollections.includes(collName)
      ? await db.collection(collName).countDocuments()
      : 0;

    summary.push({
      collection: collName,
      before: beforeCount,
      after: afterCount,
      status: beforeCount > 0 ? 'CLEARED' : 'EMPTY',
    });
  }

  // 3. Verify policies preservation & auto-heal if missing
  let policiesAfter = await Policy.countDocuments();
  if (policiesAfter === 0) {
    console.log('[reset] Policies collection was empty. Auto-seeding baseline recovery policies...');
    await seedPolicies();
    policiesAfter = await Policy.countDocuments();
  }

  // 4. Print clean report
  console.log('\n' + '-'.repeat(70));
  console.log(
    '  ' +
      'Collection'.padEnd(24) +
      'Before'.padEnd(12) +
      'After'.padEnd(12) +
      'Status'
  );
  console.log('-'.repeat(70));

  for (const row of summary) {
    console.log(
      '  ' +
        row.collection.padEnd(24) +
        String(row.before).padEnd(12) +
        String(row.after).padEnd(12) +
        row.status
    );
  }

  console.log('-'.repeat(70));
  console.log(
    '  ' +
      'policies (PROTECTED)'.padEnd(24) +
      String(policiesBefore).padEnd(12) +
      String(policiesAfter).padEnd(12) +
      'PRESERVED'
  );
  console.log('-'.repeat(70));

  console.log(`\n✅  Reset complete. All ${summary.length} transactional collections are clean.`);
  console.log(`🛡️   Policies preserved: ${policiesAfter} policies active.\n`);
  console.log('='.repeat(70));

  if (shouldDisconnect) {
    await mongoose.disconnect();
  }

  return {
    success: true,
    summary,
    policiesCount: policiesAfter,
  };
}

// Allow direct execution
if (process.argv[1] === __filename) {
  resetDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ [reset] Error during database reset:', err);
      process.exit(1);
    });
}
