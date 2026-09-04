# Diagnosis Model Evaluation

**Model**: GradientBoostingClassifier (sklearn)
**Version**: v1
**Training samples**: 3996
**Test samples**: 1004

## Overall Metrics

| Metric | Value |
|--------|-------|
| Accuracy | 0.7410 |
| Weighted Precision | 0.7241 |
| Weighted Recall | 0.7410 |
| Weighted F1 | 0.7216 |

## Per-class Metrics

| Class | Precision | Recall | F1 | Support |
|-------|-----------|--------|----|---------|
| no_recovery | 0.7704 | 0.8940 | 0.8276 | 698 |
| self_recovered | 0.6186 | 0.3922 | 0.4800 | 306 |

## Confusion Matrix

| | Predicted No Recovery | Predicted Self-Recovered |
|---|---|---|
| Actual No Recovery | 624 | 74 |
| Actual Self-Recovered | 186 | 120 |

## Feature Importance

| Feature | Importance |
|---------|------------|
| cause_category | 0.3452 |
| previous_recovery_history | 0.1732 |
| time_of_day | 0.1040 |
| previous_failure_count | 0.0874 |
| amount | 0.0652 |
| retry_count | 0.0628 |
| day_of_week | 0.0528 |
| method | 0.0480 |
| customer_segment | 0.0466 |
| subscription_flag | 0.0150 |

## Notes

- Training data is synthetically generated with deliberate noise (~3% label flips, Gaussian noise on probabilities)
- Recovery rates vary by cause but are NOT deterministic — they depend on multiple features
- The `ambiguous_timeout` cause is intentionally hard to classify, simulating real-world ambiguity
