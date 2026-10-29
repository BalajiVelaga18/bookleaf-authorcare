import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true, index: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', default: null, index: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
      index: true,
    },
    aiCategory: { type: String, default: null, index: true },
    aiPriority: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: null, index: true },
    aiRationale: { type: String, default: null },
    aiPriorityRationale: { type: String, default: null },
    aiConfidence: { type: String, default: null },
    aiMissingInfo: { type: [String], default: [] },
    aiModel: { type: String, default: null },
    aiProcessedAt: { type: Date, default: null },
    adminCategory: { type: String, default: null },
    adminPriority: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', default: null },
    assignedAt: { type: Date, default: null },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ticketSchema.index({ author: 1, status: 1 });
ticketSchema.index({ status: 1, aiPriority: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ subject: 'text', description: 'text', reference: 'text' });

ticketSchema.virtual('category').get(function () {
  return this.adminCategory || this.aiCategory || 'General Inquiry';
});

ticketSchema.virtual('priority').get(function () {
  return this.adminPriority || this.aiPriority || 'Medium';
});

ticketSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    reference: this.reference,
    author: this.author?.toString?.() || this.author,
    book: this.book?.toString?.() || this.book,
    subject: this.subject,
    description: this.description,
    status: this.status,
    category: this.category,
    priority: this.priority,
    aiCategory: this.aiCategory,
    aiPriority: this.aiPriority,
    aiRationale: this.aiRationale,
    aiPriorityRationale: this.aiPriorityRationale,
    aiConfidence: this.aiConfidence,
    aiMissingInfo: this.aiMissingInfo,
    aiModel: this.aiModel,
    aiProcessedAt: this.aiProcessedAt,
    adminCategory: this.adminCategory,
    adminPriority: this.adminPriority,
    assignedTo: this.assignedTo?.toString?.() || this.assignedTo,
    assignedAt: this.assignedAt,
    lastActivityAt: this.lastActivityAt,
    resolvedAt: this.resolvedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Ticket = mongoose.model('Ticket', ticketSchema);
