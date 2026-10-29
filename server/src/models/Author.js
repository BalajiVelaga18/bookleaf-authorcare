import mongoose from 'mongoose';

const authorSchema = new mongoose.Schema(
  {
    sourceAuthorId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: null },
    city: { type: String, trim: true, default: null },
    joinedDate: { type: Date, default: null },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['author', 'admin'], default: 'author' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

authorSchema.index({ role: 1 });

authorSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    sourceAuthorId: this.sourceAuthorId,
    name: this.name,
    email: this.email,
    phone: this.phone,
    city: this.city,
    joinedDate: this.joinedDate,
    role: this.role,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

export const Author = mongoose.model('Author', authorSchema);
