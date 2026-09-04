"""
Pytest test suite for ML diagnosis service.
Tests:
- rules.py: every error_reason maps to the expected cause category
- model.py: predict() shape, confidence range, missing field resilience
- routes/diagnose.py: /diagnose endpoint behavior with rules+ml and rules_only fallback
- model-evaluation.md: verification that documented metrics match current held-out evaluation
"""

import os
import sys
import pytest
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

# Add ml-service root to path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app import app
from diagnosis.rules import classify_cause, ERROR_REASON_TO_CAUSE, VALID_CAUSES
from diagnosis.model import predict, _load_model
from diagnosis.features import encode_features, encode_dataframe


# ─── Suite 3.1: rules.py Tests ───────────────────────────────────────────────

def test_rules_all_known_mappings():
    """Verify that every mapped error_reason produces the expected cause category."""
    for error_reason, expected_cause in ERROR_REASON_TO_CAUSE.items():
        assert classify_cause(error_reason) == expected_cause, (
            f"Mapping mismatch for '{error_reason}': expected '{expected_cause}', "
            f"got '{classify_cause(error_reason)}'"
        )


@pytest.mark.parametrize("empty_input", [None, "", "   ", "   \t\n  "])
def test_rules_empty_and_whitespace_fallback(empty_input):
    """Empty or None error_reason must fall back to ambiguous_timeout."""
    assert classify_cause(empty_input) == "ambiguous_timeout"


def test_rules_unknown_error_reason_fallback():
    """Unrecognized error_reasons must fall back to ambiguous_timeout."""
    assert classify_cause("unrecognized_bank_code_xyz99") == "ambiguous_timeout"
    assert classify_cause("random_text_123") == "ambiguous_timeout"


def test_rules_all_causes_reachable():
    """Every cause category in VALID_CAUSES must be reachable from mapped error_reasons."""
    reachable_causes = set(ERROR_REASON_TO_CAUSE.values())
    for cause in VALID_CAUSES:
        assert cause in reachable_causes, f"Cause '{cause}' is not reachable from any error_reason"


# ─── Suite 3.2: model.py Tests ───────────────────────────────────────────────

def test_model_prediction_shape_and_types():
    """predict() must return valid dict with boolean, float confidence, and str version."""
    features = {
        "amount": 149900,
        "method": "card",
        "customer_segment": "returning",
        "time_of_day": 14,
        "day_of_week": 2,
        "cause_category": "insufficient_funds",
        "previous_failure_count": 2,
        "retry_count": 1,
        "subscription_flag": 1,
        "previous_recovery_history": 0.3,
    }

    result = predict(features)
    assert isinstance(result, dict)
    assert "self_recovers_likely" in result
    assert "confidence" in result
    assert "model_version" in result
    assert isinstance(result["self_recovers_likely"], bool)
    assert isinstance(result["confidence"], float)
    assert 0.0 <= result["confidence"] <= 1.0
    assert isinstance(result["model_version"], str)


def test_model_graceful_handling_of_missing_fields():
    """predict() must encode default fallback values when fields are missing rather than raising."""
    sparse_features = {
        "amount": 50000,
        # All other fields omitted
    }
    result = predict(sparse_features)
    assert isinstance(result, dict)
    assert isinstance(result["self_recovers_likely"], bool)
    assert 0.0 <= result["confidence"] <= 1.0


def test_model_empty_features_dict():
    """predict() handles an empty dictionary gracefully using feature defaults."""
    result = predict({})
    assert isinstance(result, dict)
    assert isinstance(result["self_recovers_likely"], bool)
    assert 0.0 <= result["confidence"] <= 1.0


# ─── Suite 3.3: /diagnose API Endpoint Tests ──────────────────────────────────

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def test_diagnose_endpoint_valid_event(client):
    """POST /diagnose with normalized event returns rules+ml diagnosis."""
    event = {
        "id": "evt_test_101",
        "source": "simulator",
        "event": "payment.failed",
        "payload": {
            "payment": {
                "id": "pay_test_101",
                "amount": 149900,
                "method": "card",
                "error_reason": "insufficient_funds",
            },
            "customer": {
                "id": "cust_101",
                "segment": "returning",
            },
        },
        "customer": {
            "id": "cust_101",
            "segment": "returning",
        },
        "created_at": "2026-08-30T10:00:00Z",
    }

    response = client.post("/diagnose", json=event)
    assert response.status_code == 200
    data = response.get_json()

    assert data["cause"] == "insufficient_funds"
    assert data["diagnosis_method"] == "rules+ml"
    assert isinstance(data["self_recovers_likely"], bool)
    assert isinstance(data["confidence"], float)
    assert 0.0 <= data["confidence"] <= 1.0
    assert data["model_version"] == "v1"


def test_diagnose_endpoint_empty_body(client):
    """POST /diagnose with empty body returns 400."""
    response = client.post("/diagnose", data="", content_type="application/json")
    assert response.status_code == 400


def test_diagnose_endpoint_fallback_to_rules_only(client, monkeypatch):
    """When ML predict fails unexpectedly, /diagnose gracefully falls back to rules_only."""
    def broken_predict(_features):
        raise RuntimeError("Simulated ML inference failure")

    import diagnosis.model
    monkeypatch.setattr(diagnosis.model, "predict", broken_predict)

    event = {
        "payload": {
            "payment": {
                "error_reason": "otp_timeout",
            },
        },
    }

    response = client.post("/diagnose", json=event)
    assert response.status_code == 200
    data = response.get_json()

    assert data["cause"] == "otp_timeout"
    assert data["diagnosis_method"] == "rules_only"
    assert data["self_recovers_likely"] is None
    assert data["confidence"] is None
    assert data["model_version"] is None


# ─── Suite 3.4: Model Evaluation Doc Currency Check ──────────────────────────

def test_model_evaluation_metrics_currency():
    """
    Re-run evaluation on held-out test data and confirm accuracy, precision, recall, F1
    match the documented values in docs/model-evaluation.md.
    """
    data_dir = os.path.join(ROOT, "data")
    test_path = os.path.join(data_dir, "synthetic_failures_test.csv")
    assert os.path.exists(test_path), f"Held-out test dataset missing at {test_path}"

    df_test = pd.read_csv(test_path)
    df_test_enc = encode_dataframe(df_test)

    feature_cols = [
        "amount", "method", "customer_segment", "time_of_day", "day_of_week",
        "cause_category", "previous_failure_count", "retry_count",
        "subscription_flag", "previous_recovery_history",
    ]
    label_col = "self_recovered"

    X_test = df_test_enc[feature_cols].values
    y_test = df_test_enc[label_col].values

    model_data = _load_model()
    model = model_data["model"]

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    precision_w, recall_w, f1_w, _ = precision_recall_fscore_support(
        y_test, y_pred, average="weighted"
    )

    # Values in docs/model-evaluation.md:
    # Accuracy: 0.7410
    # Weighted Precision: 0.7241
    # Weighted Recall: 0.7410
    # Weighted F1: 0.7216
    expected_accuracy = 0.7410
    expected_prec_w = 0.7241
    expected_rec_w = 0.7410
    expected_f1_w = 0.7216

    assert round(accuracy, 4) == expected_accuracy, (
        f"Model accuracy drifted: live={accuracy:.4f}, documented={expected_accuracy:.4f}"
    )
    assert round(precision_w, 4) == expected_prec_w, (
        f"Weighted precision drifted: live={precision_w:.4f}, documented={expected_prec_w:.4f}"
    )
    assert round(recall_w, 4) == expected_rec_w, (
        f"Weighted recall drifted: live={recall_w:.4f}, documented={expected_rec_w:.4f}"
    )
    assert round(f1_w, 4) == expected_f1_w, (
        f"Weighted F1 drifted: live={f1_w:.4f}, documented={expected_f1_w:.4f}"
    )
