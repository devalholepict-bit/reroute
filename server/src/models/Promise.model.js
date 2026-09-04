import mongoose from 'mongoose';

const promiseSchema = new mongoose.Schema(
  {
    case_id: {
      type: String,
      required: true,
      index: true, // References the Event id
    },
    recovery_action_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecoveryAction',
    },
    customer_id: {
      type: String,
      index: true,
    },
    payment_id: {
      type: String,
      index: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    due_date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'fulfilled', 'missed'],
      default: 'pending',
      index: true,
    },
    fulfilled_at: {
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

const PromiseModel = mongoose.model('Promise', promiseSchema);

export default PromiseModel;
