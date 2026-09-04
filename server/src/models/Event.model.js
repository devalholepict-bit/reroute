import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    id:      { type: String },
    contact: { type: String },
    email:   { type: String },
    segment: { type: String },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      enum: ['simulator', 'razorpay_test'],
    },
    event: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'pending_diagnosis',
        'diagnosed',
        'policy_applied',
        'executed',
        'resolved',
      ],
      default: 'pending_diagnosis',
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
    raw_payload: {
      type: mongoose.Schema.Types.Mixed,
    },
    customer: {
      type: customerSchema,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Disable versionKey (__v) — we track state via status field
    versionKey: false,
  }
);

const Event = mongoose.model('Event', eventSchema);

export default Event;
