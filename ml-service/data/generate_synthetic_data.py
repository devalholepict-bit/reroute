"""
Generate synthetic labeled dataset for payment failure self-recovery prediction.

Output:
  - data/synthetic_failures.csv       (80% train)
  - data/synthetic_failures_test.csv  (20% held-out test, stratified by cause_category)

Columns:
  amount, method, customer_segment, time_of_day, day_of_week,
  cause_category, previous_failure_count, retry_count,
  subscription_flag, previous_recovery_history, self_recovered (label)
"""

import os
import random
import csv
import math

# Reproducible but not trivially memorizable
random.seed(42)

CAUSES = [
    "insufficient_funds",
    "card_expired",
    "bank_server_timeout",
    "otp_timeout",
    "generic_decline",
    "ambiguous_timeout",
]

METHODS = ["card", "upi", "netbanking", "wallet"]
SEGMENTS = ["new", "returning", "churned", "high_value"]
AMOUNTS = [49900, 99900, 149900, 199900, 299900, 499900, 999900, 1499900]

N_SAMPLES = 5000


def generate_row():
    """Generate one labeled row with realistic noise."""
    cause = random.choice(CAUSES)
    method = random.choice(METHODS)
    segment = random.choice(SEGMENTS)
    amount = random.choice(AMOUNTS)
    hour = random.randint(0, 23)
    day = random.randint(0, 6)  # 0=Mon, 6=Sun
    prev_failures = random.randint(0, 12)
    retry_count = random.randint(0, 5)
    subscription_flag = random.choice([0, 1])
    prev_recovery = round(random.uniform(0.0, 1.0), 2)

    # ── Base recovery probability per cause ──────────────────────
    # These are NOT deterministic — just base rates with noise
    base_rates = {
        "insufficient_funds": 0.15,   # Rarely self-recovers
        "card_expired":       0.05,   # Almost never
        "bank_server_timeout": 0.70,  # Often transient
        "otp_timeout":        0.55,   # Often user just retries
        "generic_decline":    0.20,   # Usually persistent
        "ambiguous_timeout":  0.45,   # Truly uncertain
    }

    prob = base_rates[cause]

    # ── Feature-dependent adjustments (add signal, not perfection) ──
    # High retry count slightly reduces recovery
    prob -= retry_count * 0.03

    # High previous recovery history boosts recovery
    prob += prev_recovery * 0.15

    # High-value customers are more likely to retry and recover
    if segment == "high_value":
        prob += 0.08
    elif segment == "churned":
        prob -= 0.10

    # Many previous failures = less likely to recover
    prob -= prev_failures * 0.015

    # Late night transactions recover less
    if hour >= 23 or hour <= 5:
        prob -= 0.08

    # Weekend slightly different patterns
    if day >= 5:
        prob += 0.03

    # Higher amounts slightly less likely to recover
    if amount >= 499900:
        prob -= 0.05

    # Netbanking + bank_server_timeout is more transient
    if method == "netbanking" and cause == "bank_server_timeout":
        prob += 0.10

    # UPI failures more often user-side
    if method == "upi":
        prob += 0.05

    # ── Inject deliberate noise ──────────────────────────────────
    # Add Gaussian noise to make the boundary fuzzy
    noise = random.gauss(0, 0.12)
    prob += noise

    # Clamp
    prob = max(0.02, min(0.98, prob))

    # ── Label ────────────────────────────────────────────────────
    self_recovered = 1 if random.random() < prob else 0

    # ── Additional noise: randomly flip ~3% of labels ────────────
    if random.random() < 0.03:
        self_recovered = 1 - self_recovered

    return {
        "amount": amount,
        "method": method,
        "customer_segment": segment,
        "time_of_day": hour,
        "day_of_week": day,
        "cause_category": cause,
        "previous_failure_count": prev_failures,
        "retry_count": retry_count,
        "subscription_flag": subscription_flag,
        "previous_recovery_history": prev_recovery,
        "self_recovered": self_recovered,
    }


def main():
    # Generate all data
    rows = [generate_row() for _ in range(N_SAMPLES)]

    # Stratified split by cause_category (80/20)
    from collections import defaultdict
    by_cause = defaultdict(list)
    for row in rows:
        by_cause[row["cause_category"]].append(row)

    train_rows = []
    test_rows = []

    for cause, cause_rows in by_cause.items():
        random.shuffle(cause_rows)
        split_idx = int(len(cause_rows) * 0.8)
        train_rows.extend(cause_rows[:split_idx])
        test_rows.extend(cause_rows[split_idx:])

    random.shuffle(train_rows)
    random.shuffle(test_rows)

    # Write CSVs
    fieldnames = list(rows[0].keys())
    data_dir = os.path.join(os.path.dirname(__file__))
    os.makedirs(data_dir, exist_ok=True)

    train_path = os.path.join(data_dir, "synthetic_failures.csv")
    test_path = os.path.join(data_dir, "synthetic_failures_test.csv")

    for path, data in [(train_path, train_rows), (test_path, test_rows)]:
        with open(path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
        print(f"Wrote {len(data)} rows to {path}")

    # Print class distribution
    for label_name, dataset, name in [
        ("self_recovered", train_rows, "Train"),
        ("self_recovered", test_rows, "Test"),
    ]:
        pos = sum(1 for r in dataset if r[label_name] == 1)
        neg = len(dataset) - pos
        print(f"  {name}: {pos} positive ({pos/len(dataset)*100:.1f}%), {neg} negative ({neg/len(dataset)*100:.1f}%)")

    # Print per-cause recovery rates
    print("\nPer-cause recovery rates (train):")
    for cause in CAUSES:
        cause_data = [r for r in train_rows if r["cause_category"] == cause]
        if cause_data:
            rate = sum(1 for r in cause_data if r["self_recovered"] == 1) / len(cause_data)
            print(f"  {cause}: {rate:.2%} ({len(cause_data)} samples)")


if __name__ == "__main__":
    main()
