"""
Train a GradientBoostingClassifier on synthetic payment failure data.

Reads:
  data/synthetic_failures.csv      (train)
  data/synthetic_failures_test.csv (held-out test)

Outputs:
  models/diagnosis_model.pkl
  docs/model-evaluation.md
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    precision_recall_fscore_support,
)

# Resolve paths relative to ml-service root
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
MODEL_DIR = os.path.join(ROOT, "models")
DOCS_DIR = os.path.join(ROOT, "docs")

# Add parent to path so we can import diagnosis modules
sys.path.insert(0, ROOT)
from diagnosis.features import encode_dataframe

FEATURE_COLS = [
    "amount", "method", "customer_segment", "time_of_day", "day_of_week",
    "cause_category", "previous_failure_count", "retry_count",
    "subscription_flag", "previous_recovery_history",
]
LABEL_COL = "self_recovered"
MODEL_VERSION = "v1"


def main():
    print("=" * 60)
    print("  ReRoute Diagnosis Model — Training Pipeline")
    print("=" * 60)

    # ── Load data ────────────────────────────────────────────────
    train_path = os.path.join(DATA_DIR, "synthetic_failures.csv")
    test_path = os.path.join(DATA_DIR, "synthetic_failures_test.csv")

    if not os.path.exists(train_path):
        print(f"\n⚠ Training data not found at {train_path}")
        print("  Run: python data/generate_synthetic_data.py first")
        sys.exit(1)

    df_train = pd.read_csv(train_path)
    df_test = pd.read_csv(test_path)

    print(f"\nDataset sizes:")
    print(f"  Train: {len(df_train)} rows")
    print(f"  Test:  {len(df_test)} rows")

    # ── Encode features ──────────────────────────────────────────
    df_train_enc = encode_dataframe(df_train)
    df_test_enc = encode_dataframe(df_test)

    X_train = df_train_enc[FEATURE_COLS].values
    y_train = df_train_enc[LABEL_COL].values
    X_test = df_test_enc[FEATURE_COLS].values
    y_test = df_test_enc[LABEL_COL].values

    print(f"\nClass distribution (train):")
    print(f"  Positive (self_recovered=1): {y_train.sum()} ({y_train.mean()*100:.1f}%)")
    print(f"  Negative (self_recovered=0): {(1-y_train).sum()} ({(1-y_train.mean())*100:.1f}%)")

    # ── Train model ──────────────────────────────────────────────
    print(f"\nTraining GradientBoostingClassifier...")

    model = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        min_samples_split=20,
        min_samples_leaf=10,
        random_state=42,
    )

    model.fit(X_train, y_train)

    # ── Evaluate ─────────────────────────────────────────────────
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_test, y_pred, average=None, labels=[0, 1]
    )
    precision_w, recall_w, f1_w, _ = precision_recall_fscore_support(
        y_test, y_pred, average="weighted"
    )
    cm = confusion_matrix(y_test, y_pred)
    report = classification_report(y_test, y_pred, target_names=["no_recovery", "self_recovered"])

    print(f"\n{'=' * 60}")
    print(f"  EVALUATION RESULTS (Held-out Test Set)")
    print(f"{'=' * 60}")
    print(f"\n  Accuracy: {accuracy:.4f}")
    print(f"\n  Per-class metrics:")
    print(f"  {'Class':<20} {'Precision':>10} {'Recall':>10} {'F1':>10} {'Support':>10}")
    print(f"  {'-'*60}")
    print(f"  {'no_recovery':<20} {precision[0]:>10.4f} {recall[0]:>10.4f} {f1[0]:>10.4f} {support[0]:>10}")
    print(f"  {'self_recovered':<20} {precision[1]:>10.4f} {recall[1]:>10.4f} {f1[1]:>10.4f} {support[1]:>10}")
    print(f"  {'-'*60}")
    print(f"  {'weighted avg':<20} {precision_w:>10.4f} {recall_w:>10.4f} {f1_w:>10.4f} {sum(support):>10}")

    print(f"\n  Confusion Matrix:")
    print(f"                    Predicted")
    print(f"                  No Recovery  Self-Recovered")
    print(f"  Actual No Recovery    {cm[0][0]:>5}         {cm[0][1]:>5}")
    print(f"  Actual Recovered      {cm[1][0]:>5}         {cm[1][1]:>5}")

    print(f"\n  Full classification report:")
    print(report)

    # ── Sanity check: warn if suspiciously perfect ───────────────
    if accuracy > 0.95:
        print("[!] WARNING: Accuracy > 95% -- model may be overfitting or data may be too clean!")
        print("  Review the synthetic data generation for insufficient noise.")
    elif accuracy < 0.55:
        print("[!] WARNING: Accuracy < 55% -- model is barely better than random.")
        print("  Review feature engineering or data quality.")
    else:
        print(f"[OK] Accuracy {accuracy:.4f} is in a credible range (55-95%).")

    # ── Feature importance ───────────────────────────────────────
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    print(f"\n  Feature Importance:")
    for i in sorted_idx:
        print(f"    {FEATURE_COLS[i]:<30} {importances[i]:.4f}")

    # ── Per-cause accuracy ───────────────────────────────────────
    print(f"\n  Per-cause test accuracy:")
    # Need original (un-encoded) cause categories from test set
    for cause_name, cause_code in [
        ("insufficient_funds", 0), ("card_expired", 1),
        ("bank_server_timeout", 2), ("otp_timeout", 3),
        ("generic_decline", 4), ("ambiguous_timeout", 5),
    ]:
        mask = df_test_enc["cause_category"] == cause_code
        if mask.sum() > 0:
            cause_acc = accuracy_score(y_test[mask], y_pred[mask])
            cause_n = mask.sum()
            print(f"    {cause_name:<25} {cause_acc:.4f}  (n={cause_n})")

    # ── Save model ───────────────────────────────────────────────
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, "diagnosis_model.pkl")
    joblib.dump({
        "model": model,
        "version": MODEL_VERSION,
        "feature_columns": FEATURE_COLS,
        "accuracy": accuracy,
    }, model_path)
    print(f"\n[OK] Model saved to {model_path}")

    # ── Write evaluation doc ─────────────────────────────────────
    os.makedirs(DOCS_DIR, exist_ok=True)
    doc_path = os.path.join(DOCS_DIR, "model-evaluation.md")

    with open(doc_path, "w") as f:
        f.write("# Diagnosis Model Evaluation\n\n")
        f.write(f"**Model**: GradientBoostingClassifier (sklearn)\n")
        f.write(f"**Version**: {MODEL_VERSION}\n")
        f.write(f"**Training samples**: {len(df_train)}\n")
        f.write(f"**Test samples**: {len(df_test)}\n\n")

        f.write("## Overall Metrics\n\n")
        f.write(f"| Metric | Value |\n")
        f.write(f"|--------|-------|\n")
        f.write(f"| Accuracy | {accuracy:.4f} |\n")
        f.write(f"| Weighted Precision | {precision_w:.4f} |\n")
        f.write(f"| Weighted Recall | {recall_w:.4f} |\n")
        f.write(f"| Weighted F1 | {f1_w:.4f} |\n\n")

        f.write("## Per-class Metrics\n\n")
        f.write("| Class | Precision | Recall | F1 | Support |\n")
        f.write("|-------|-----------|--------|----|---------|\n")
        f.write(f"| no_recovery | {precision[0]:.4f} | {recall[0]:.4f} | {f1[0]:.4f} | {support[0]} |\n")
        f.write(f"| self_recovered | {precision[1]:.4f} | {recall[1]:.4f} | {f1[1]:.4f} | {support[1]} |\n\n")

        f.write("## Confusion Matrix\n\n")
        f.write("| | Predicted No Recovery | Predicted Self-Recovered |\n")
        f.write("|---|---|---|\n")
        f.write(f"| Actual No Recovery | {cm[0][0]} | {cm[0][1]} |\n")
        f.write(f"| Actual Self-Recovered | {cm[1][0]} | {cm[1][1]} |\n\n")

        f.write("## Feature Importance\n\n")
        f.write("| Feature | Importance |\n")
        f.write("|---------|------------|\n")
        for i in sorted_idx:
            f.write(f"| {FEATURE_COLS[i]} | {importances[i]:.4f} |\n")
        f.write("\n")

        f.write("## Notes\n\n")
        f.write("- Training data is synthetically generated with deliberate noise (~3% label flips, Gaussian noise on probabilities)\n")
        f.write("- Recovery rates vary by cause but are NOT deterministic — they depend on multiple features\n")
        f.write("- The `ambiguous_timeout` cause is intentionally hard to classify, simulating real-world ambiguity\n")

    print(f"[OK] Evaluation doc written to {doc_path}")
    print(f"\n{'=' * 60}")
    print(f"  Training complete!")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
