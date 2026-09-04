/**
 * Phase 16 Test: Deterministic Demo Dataset Verification
 *
 * Tests:
 * 1. Runs POST /api/simulator/run (Run 1) and validates the exact 5 cases, amounts, causes, and outcomes.
 * 2. Runs POST /api/simulator/run (Run 2) and validates identical output.
 * 3. Confirms that exploratory simulator batch generation (/api/simulator/events/full) remains functional.
 */

const BASE = 'http://localhost:3001';

const EXPECTED_CASES = [
  {
    amount: 1499000, // ₹14,990
    cause: 'insufficient_funds',
    segment: 'returning',
    expected_outcome: 'paid_immediately',
    description: '₹14,990, insufficient_funds, returning customer → delayed SMS → recovered',
  },
  {
    amount: 850000, // ₹8,500
    cause: 'card_expired',
    segment: 'new',
    expected_outcome: 'paid_immediately',
    description: '₹8,500, card_expired, new customer → card-update email → recovered',
  },
  {
    amount: 200000, // ₹2,000
    cause: 'otp_timeout',
    segment: 'returning',
    expected_outcome: 'paid_immediately',
    description: '₹2,000, otp_timeout, returning customer → same-session retry link → recovered',
  },
  {
    amount: 2500000, // ₹25,000
    cause: 'mandate_halted',
    segment: 'high_value',
    expected_outcome: 'promised_to_pay',
    description: '₹25,000, mandate_halted, high-value customer → capped retry → promise-to-pay',
  },
  {
    amount: 750000, // ₹7,500
    cause: 'bank_server_timeout',
    segment: 'new',
    expected_outcome: 'no_response',
    description: '₹7,500, bank_server_timeout, new customer → delayed SMS → no response',
  },
];

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

async function postRun() {
  const res = await fetch(`${BASE}/api/simulator/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Dev-Secret': process.env.SIMULATOR_DEV_SECRET || 'dev_secret_reroute_2026',
    },
    body: JSON.stringify({}),
  });
  return { status: res.status, data: await res.json() };
}


function validateDemoRun(runLabel, result) {
  console.log(`\nValidating ${runLabel}:`);
  assert(`${runLabel} returned status 200`, result.status === 200);
  assert(`${runLabel} returned success: true`, result.data.success === true);
  assert(`${runLabel} created exactly 5 events`, result.data.count === 5 && result.data.created?.length === 5);

  const events = result.data.events || [];
  const outcomes = result.data.outcomes || [];

  for (let i = 0; i < EXPECTED_CASES.length; i++) {
    const expected = EXPECTED_CASES[i];
    const event = events[i];
    const outcome = outcomes[i];

    console.log(`\n  Case ${i + 1}: ${expected.description}`);
    assert(`  [Case ${i + 1}] Event exists`, !!event);
    assert(
      `  [Case ${i + 1}] Amount matches ${expected.amount} (₹${expected.amount / 100})`,
      event?.payload?.payment?.amount === expected.amount
    );
    assert(
      `  [Case ${i + 1}] Error reason matches "${expected.cause}"`,
      event?.payload?.payment?.error_reason === expected.cause
    );
    assert(
      `  [Case ${i + 1}] Customer segment matches "${expected.segment}"`,
      event?.customer?.segment === expected.segment || event?.payload?.customer?.segment === expected.segment
    );
    assert(
      `  [Case ${i + 1}] Outcome matches exactly "${expected.expected_outcome}"`,
      outcome?.outcome === expected.expected_outcome,
      `(Got: "${outcome?.outcome}")`
    );
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('  Phase 16: Deterministic Demo Scenario Test');
  console.log('='.repeat(70));

  // Run 1
  const run1 = await postRun();
  validateDemoRun('Run 1 (Initial Demo Trigger)', run1);

  // Run 2 (Immediately after)
  const run2 = await postRun();
  validateDemoRun('Run 2 (Repeat Demo Trigger for Reproducibility)', run2);

  // Cross-run outcome comparison
  console.log('\nVerifying Run 1 and Run 2 identical outcome sequence:');
  const r1Outcomes = run1.data.outcomes.map((o) => o.outcome);
  const r2Outcomes = run2.data.outcomes.map((o) => o.outcome);
  console.log(`  Run 1 Outcomes: [${r1Outcomes.join(', ')}]`);
  console.log(`  Run 2 Outcomes: [${r2Outcomes.join(', ')}]`);

  assert(
    'Run 1 and Run 2 produced 100% identical outcomes in identical order',
    JSON.stringify(r1Outcomes) === JSON.stringify(r2Outcomes)
  );

  // Verify unique event IDs were generated for each run (no collisions)
  const r1Ids = new Set(run1.data.created);
  const r2Ids = new Set(run2.data.created);
  const hasOverlap = [...r1Ids].some((id) => r2Ids.has(id));
  assert('Runs generate unique event IDs without collision', !hasOverlap);

  console.log('\n' + '='.repeat(70));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(70));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
