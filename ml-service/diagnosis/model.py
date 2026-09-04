"""
ML model loader and predictor for self-recovery prediction.

Loads the trained GradientBoostingClassifier from models/diagnosis_model.pkl
and exposes a predict(features_dict) function.
"""

import os
import joblib
import numpy as np

# Resolve model path relative to ml-service root
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(ROOT, "models", "diagnosis_model.pkl")

_model_data = None


def _load_model():
    """Lazy-load the model on first prediction."""
    global _model_data
    if _model_data is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model file not found at {MODEL_PATH}. "
                "Run diagnosis/train.py first."
            )
        _model_data = joblib.load(MODEL_PATH)
    return _model_data


def predict(features_dict: dict) -> dict:
    """
    Predict whether a payment failure is likely to self-recover.

    Args:
        features_dict: dict with keys matching training features:
            amount, method, customer_segment, time_of_day, day_of_week,
            cause_category, previous_failure_count, retry_count,
            subscription_flag, previous_recovery_history

    Returns:
        {
            "self_recovers_likely": bool,
            "confidence": float (0.0 - 1.0),
            "model_version": str
        }
    """
    from diagnosis.features import encode_features

    model_data = _load_model()
    model = model_data["model"]
    version = model_data["version"]

    # Encode features
    features_array = encode_features(features_dict).reshape(1, -1)

    # Predict
    prediction = model.predict(features_array)[0]
    probabilities = model.predict_proba(features_array)[0]

    # Confidence = probability of the predicted class
    confidence = float(probabilities[int(prediction)])

    return {
        "self_recovers_likely": bool(prediction == 1),
        "confidence": round(confidence, 4),
        "model_version": version,
    }
