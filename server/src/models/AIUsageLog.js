import mongoose from 'mongoose';

const aiUsageLogSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null, index: true },
    operation: { type: String, required: true, enum: ['classify', 'draft'] },
    model: { type: String, required: true },
    success: { type: Boolean, required: true },
    errorMessage: { type: String, default: null },
    inputTokens: { type: Number, default: null },
    outputTokens: { type: Number, default: null },
    durationMs: { type: Number, default: null },
  },
  { timestamps: true }
);

export const AIUsageLog = mongoose.model('AIUsageLog', aiUsageLogSchema);
