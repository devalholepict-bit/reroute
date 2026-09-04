import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
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
    cause: {
      type: String,
      index: true,
    },
    confidence: {
      type: Number,
    },
    policy: {
      type: String,
    },
    action: {
      type: String,
    },
    channel: {
      type: String,
    },
    attempt_number: {
      type: Number,
    },
    outcome: {
      type: String,
      index: true,
    },
    reason: {
      type: String,
    },
    stopping_rule_status: {
      type: String,
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

auditLogSchema.index({ payment_id: 1, timestamp: 1 });
auditLogSchema.index({ customer_id: 1, timestamp: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
