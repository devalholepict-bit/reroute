import mongoose from 'mongoose';

const diagnosisSchema = new mongoose.Schema(
  {
    event_id: {
      type: String,
      required: true,
      index: true,
    },
    cause: {
      type: String,
      required: true,
    },
    self_recovers_likely: {
      type: Boolean,
      default: null,
    },
    confidence: {
      type: Number,
      default: null,
    },
    diagnosis_method: {
      type: String,
      enum: ['rules+ml', 'rules_only', 'rules_fallback'],
      required: true,
    },
    model_version: {
      type: String,
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

const Diagnosis = mongoose.model('Diagnosis', diagnosisSchema);

export default Diagnosis;
