# ReRoute Testing Guide

This guide documents the complete test architecture and instructions to run all 6 test suites across ReRoute.

---

## Quick Test Commands

### 1. Backend Unit Tests
Runs isolated unit tests for all 9 core services (normalizer, dedup, ML client fallback, policy engine, stopping rules boundaries, channel simulator copy, outcome distributions, promise tracker, and audit single-writer invariant):
```bash
cd server && npx jest tests/unit --verbose
```

### 2. Backend Integration Tests
Runs isolated integration tests using `mongodb-memory-server` without touching the live database (covers deduplication, malformed webhook payloads, missing environment variables, and full single-case pipeline flow):
```bash
cd server && npx jest tests/integration/webhooks.test.js tests/integration/pipeline.test.js tests/integration/envConfig.test.js --verbose
```

### 3. ML Service Tests
Runs Python pytest tests for rules classification, model inference, and held-out test evaluation currency against `docs/model-evaluation.md`:
```bash
cd ml-service && .\venv\Scripts\python.exe -m pytest tests/ -v
```

### 4. Frontend Component & Hook Tests
Runs Vitest + React Testing Library tests for Live Funnel, Case Detail (verifying field completeness), Audit Log filter table, and usePolling deduplication:
```bash
cd client && npx vitest run
```

### 5. End-to-End Pipeline Suite (All 6 Causes)
Runs complete pipeline simulation across all 6 failure causes and asserts gap-free audit trails:
```bash
cd server && npx jest tests/integration/e2e-flow.test.js --verbose
```

### 6. Phase 16 Demo Scenario Regression Test
Runs the deterministic 5-case demo batch across 3 consecutive runs and verifies 100% byte-for-byte reproducibility with 0 flakes:
```bash
cd server && npx jest tests/integration/demo-scenario.test.js --verbose
```

---

## Live Multi-Tier Service Startup Sequence

To run the live full-stack application (for manual exploratory testing):

1. **Terminal 1 — MongoDB & Backend**:
   ```bash
   cd server && npm run dev
   ```
2. **Terminal 2 — ML Service**:
   ```bash
   cd ml-service && .\venv\Scripts\python.exe app.py
   ```
3. **Terminal 3 — Frontend Dashboard**:
   ```bash
   cd client && npm run dev
   ```
4. **Terminal 4 — Demo Trigger / Simulator**:
   ```bash
   node simulator/testDemoScenario.js
   ```
