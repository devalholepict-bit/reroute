"""
Feature encoding for the diagnosis ML model.

Converts raw event fields (categorical + temporal) into model-ready numeric features.
Must match exactly what train.py uses.
"""

import numpy as np
from datetime import datetime

# ── Encoding maps (must match training) ──────────────────────────────────────

METHOD_MAP = {"card": 0, "upi": 1, "netbanking": 2, "wallet": 3}
SEGMENT_MAP = {"new": 0, "returning": 1, "churned": 2, "high_value": 3}
CAUSE_MAP = {
    "insufficient_funds": 0,
    "card_expired": 1,
    "bank_server_timeout": 2,
    "otp_timeout": 3,
    "generic_decline": 4,
    "ambiguous_timeout": 5,
}


def encode_features(features_dict: dict) -> np.ndarray:
    """
    Encode a features dictionary into a 1D numpy array matching training columns.

    Expected keys:
        amount, method, customer_segment, time_of_day, day_of_week,
        cause_category, previous_failure_count, retry_count,
        subscription_flag, previous_recovery_history

    Returns:
        np.ndarray of shape (10,) — ready for model.predict
    """
    return np.array([
        _normalize_amount(features_dict.get("amount", 99900)),
        METHOD_MAP.get(features_dict.get("method", "card"), 0),
        SEGMENT_MAP.get(features_dict.get("customer_segment", "new"), 0),
        features_dict.get("time_of_day", 12),
        features_dict.get("day_of_week", 3),
        CAUSE_MAP.get(features_dict.get("cause_category", "ambiguous_timeout"), 5),
        features_dict.get("previous_failure_count", 0),
        features_dict.get("retry_count", 0),
        features_dict.get("subscription_flag", 0),
        features_dict.get("previous_recovery_history", 0.5),
    ], dtype=np.float64)


def encode_features_from_event(event: dict, cause_category: str) -> dict:
    """
    Extract feature dict from a normalized event payload (as sent to /diagnose).

    Args:
        event: The full normalized event (with payload, customer, etc.)
        cause_category: The cause determined by the rules layer

    Returns:
        dict matching the expected features_dict shape
    """
    payment = event.get("payload", {}).get("payment", {})
    subscription = event.get("payload", {}).get("subscription", {})
    customer = event.get("customer", {}) or event.get("payload", {}).get("customer", {})

    # Extract time features from created_at
    created_at = event.get("created_at")
    if isinstance(created_at, str):
        try:
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            hour = dt.hour
            day = dt.weekday()
        except (ValueError, AttributeError):
            hour = 12
            day = 3
    else:
        hour = 12
        day = 3

    return {
        "amount": payment.get("amount", 99900),
        "method": payment.get("method", "card"),
        "customer_segment": customer.get("segment", "new") or "new",
        "time_of_day": hour,
        "day_of_week": day,
        "cause_category": cause_category,
        "previous_failure_count": event.get("previous_failure_count", 0),
        "retry_count": subscription.get("retry_count", 0) or 0,
        "subscription_flag": 1 if subscription.get("id") else 0,
        "previous_recovery_history": event.get("previous_recovery_history", 0.5),
    }


def _normalize_amount(amount):
    """Keep amount as-is — the model was trained on raw paise values."""
    return float(amount) if amount else 99900.0


# ── For training: encode a full pandas DataFrame ──────────────────────────────

def encode_dataframe(df):
    """
    Encode a pandas DataFrame for training. Modifies in-place and returns it.
    """
    df = df.copy()
    df["method"] = df["method"].map(METHOD_MAP).fillna(0).astype(int)
    df["customer_segment"] = df["customer_segment"].map(SEGMENT_MAP).fillna(0).astype(int)
    df["cause_category"] = df["cause_category"].map(CAUSE_MAP).fillna(5).astype(int)
    return df
