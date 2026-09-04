"""
Deterministic rules layer: maps error_reason strings to cause categories.

This is the first layer of diagnosis — fast, explainable, no ML needed.
The ML layer adds the self-recovery prediction on top.
"""

# Maps Razorpay error_reason → internal cause_category
ERROR_REASON_TO_CAUSE = {
    # Direct matches
    "insufficient_funds":   "insufficient_funds",
    "card_expired":         "card_expired",
    "bank_server_timeout":  "bank_server_timeout",
    "otp_timeout":          "otp_timeout",
    "generic_decline":      "generic_decline",
    "mandate_halted":       "mandate_halted",
    "subscription_halted":  "mandate_halted",
    "mandate_failed":       "mandate_halted",

    # Ambiguous / timeout variants (from simulator ambiguous_timeout)
    "timeout":              "ambiguous_timeout",
    "gateway_timeout":      "ambiguous_timeout",
    "unknown_timeout":      "ambiguous_timeout",

    # Additional Razorpay error_reasons we might encounter
    "payment_declined":     "generic_decline",
    "card_declined":        "generic_decline",
    "invalid_card":         "card_expired",
    "expired_card":         "card_expired",
    "server_error":         "bank_server_timeout",
    "network_error":        "bank_server_timeout",
    "authentication_failed": "otp_timeout",
    "otp_expired":          "otp_timeout",
    "3ds_failed":           "otp_timeout",
    "issuer_declined":      "generic_decline",
    "do_not_honor":         "generic_decline",
    "transaction_not_permitted": "generic_decline",
    "insufficient_balance": "insufficient_funds",
    "low_balance":          "insufficient_funds",
}

# All valid cause categories
VALID_CAUSES = [
    "insufficient_funds",
    "card_expired",
    "bank_server_timeout",
    "otp_timeout",
    "generic_decline",
    "ambiguous_timeout",
]


def classify_cause(error_reason: str) -> str:
    """
    Classify an error_reason string into a cause category.

    Args:
        error_reason: The error_reason from the payment payload

    Returns:
        cause_category string

    Falls back to 'ambiguous_timeout' for unknown error_reasons
    since those are inherently uncertain.
    """
    if not error_reason:
        return "ambiguous_timeout"

    normalized = error_reason.strip().lower()
    return ERROR_REASON_TO_CAUSE.get(normalized, "ambiguous_timeout")
