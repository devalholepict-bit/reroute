import mongoose from 'mongoose';

const recoveryActionSchema = new mongoose.Schema(
  {
    event_id: {
      type: String,
      required: true,
      index: true,
    },
    customer_id: {
      type: String,
      index: true,
    },
    payment_id: {
      type: String,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      required: true,
    },
    timing: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    attempt_number: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'allowed', 'blocked', 'executed'],
      default: 'pending',
    },
    block_reason: {
      type: String,
      default: null,
    },
    message_sent: {
      type: String,
      default: null,
    },
    executed_at: {
      type: Date,
      default: null,
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

const RecoveryAction = mongoose.model('RecoveryAction', recoveryActionSchema);

export default RecoveryAction;
