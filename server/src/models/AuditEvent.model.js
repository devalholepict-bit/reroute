import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema(
  {
    event_id: {
      type: String,
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
    event_type: {
      type: String,
      required: true,
      index: true, // e.g. 'stopped_contact_cap', 'stopped_cooldown', 'execution_allowed'
    },
    reason: {
      type: String,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
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

const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);

export default AuditEvent;
