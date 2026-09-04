/**
 * Phase 3 Fallback Test
 *
 * Tests that diagnosis still works when Flask/ML service is DOWN,
 * falling back to rules_fallback mode.
 *
 * Run with Flask stopped: node simulator/testFallback.js
 */

const BASE = 'http://localhost:3001';

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  [OK] ${label}`);
    passed++;
  } else {
    console.log(`  [FAIL] ${label} ${detail}`);
    failed++;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Phase 3 Fallback Test (Flask is DOWN)');
  console.log('='.repeat(60));

  // Verify Flask is actually down
  console.log('\nVerifying Flask is down...');
  try {
    await fetch('http://localhost:5001/health', { signal: AbortSignal.timeout(2000) });
    console.log('  [WARN] Flask is still running! Kill it first for this test.');
    process.exit(1);
  } catch {
    console.log('  [OK] Flask is confirmed down');
    passed++;
  }

  // Test simulator with Flask down — should fallback gracefully
  console.log('\nTest: Simulator creates events with fallback diagnosis');

  const causes = ['insufficient_funds', 'card_expired', 'bank_server_timeout',
    'otp_timeout', 'generic_decline', 'ambiguous_timeout'];

  for (const cause of causes) {
    const start = Date.now();
    const sim = await post(`${BASE}/api/simulator/events`, { cause, count: 1 });
    const elapsed = Date.now() - start;

    assert(`${cause}: 200 (not 500)`, sim.status === 200,
      `got ${sim.status}: ${JSON.stringify(sim.data)}`);
    assert(`${cause}: created event`, sim.data.created?.length === 1);
    assert(`${cause}: reasonable time (< 5s)`, elapsed < 5000,
      `took ${elapsed}ms — timeout should be 3s`);

    console.log(`    elapsed: ${elapsed}ms`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
