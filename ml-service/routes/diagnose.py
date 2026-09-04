"""
POST /diagnose route — combines deterministic rules + ML prediction.

Accepts a normalized event, runs:
  1. rules.py → cause_category
  2. model.py → self_recovery prediction

Returns:
  {
    "cause": "insufficient_funds",
    "self_recovers_likely": false,
    "confidence": 0.82,
    "diagnosis_method": "rules+ml",
    "model_version": "v1"
  }

On ML failure, gracefully degrades to rules_only.
"""

from flask import Blueprint, request, jsonify
from diagnosis.rules import classify_cause
from diagnosis.features import encode_features_from_event

diagnose_bp = Blueprint("diagnose", __name__)


@diagnose_bp.route("/diagnose", methods=["POST"])
def diagnose():
    """Diagnose a normalized event."""
    event = request.get_json(force=True, silent=True)

    if not event:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    # ── Layer 1: Deterministic rules ─────────────────────────────
    payment = event.get("payload", {}).get("payment", {})
    error_reason = payment.get("error_reason", "")
    cause = classify_cause(error_reason)

    # ── Layer 2: ML prediction ───────────────────────────────────
    try:
        from diagnosis.model import predict

        features = encode_features_from_event(event, cause)
        ml_result = predict(features)

        return jsonify({
            "cause": cause,
            "self_recovers_likely": ml_result["self_recovers_likely"],
            "confidence": ml_result["confidence"],
            "diagnosis_method": "rules+ml",
            "model_version": ml_result["model_version"],
        })

    except Exception as e:
        # ML failure → graceful degradation
        print(f"[diagnose] ML prediction failed, falling back to rules_only: {e}")

        return jsonify({
            "cause": cause,
            "self_recovers_likely": None,
            "confidence": None,
            "diagnosis_method": "rules_only",
            "model_version": None,
        })
