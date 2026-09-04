import mongoose from 'mongoose';

const policySchema = new mongoose.Schema(
  {
    cause: {
      type: String,
      required: true,
      unique: true,
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
    reason_template: {
      type: String,
      required: true,
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

const Policy = mongoose.model('Policy', policySchema);

export default Policy;
