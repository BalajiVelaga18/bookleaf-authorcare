import mongoose from 'mongoose';

const ticketMessageSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
    senderRole: { type: String, enum: ['author', 'admin'], required: true },
    body: { type: String, required: true, trim: true },
    visibility: { type: String, enum: ['public', 'internal'], default: 'public', index: true },
    isAiDraft: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ticketMessageSchema.index({ ticket: 1, visibility: 1 });
ticketMessageSchema.index({ createdAt: 1 });

export const TicketMessage = mongoose.model('TicketMessage', ticketMessageSchema);
