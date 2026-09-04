import mongoose from 'mongoose';

const outcomeSchema = new mongoose.Schema(
  {
    recovery_action_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecoveryAction',
      required: true,
      index: true,
    },
    event_id: {
      type: String,
      index: true,
    },
    outcome: {
      type: String,
      enum: ['paid_immediately', 'promised_to_pay', 'no_response', 'failed_again'],
      required: true,
    },
    amount_recovered: {
      type: Number,
      default: 0,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

const Outcome = mongoose.model('Outcome', outcomeSchema);

export default Outcome;
