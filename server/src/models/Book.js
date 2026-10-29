import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
  {
    sourceBookId: { type: String, required: true, unique: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true, index: true },
    title: { type: String, required: true, trim: true },
    isbn: { type: String, default: null, trim: true },
    genre: { type: String, default: null, trim: true },
    publicationDate: { type: Date, default: null },
    status: { type: String, default: null, trim: true },
    mrp: { type: Number, default: null },
    authorRoyaltyPerCopy: { type: Number, default: null },
    totalCopiesSold: { type: Number, default: 0 },
    totalRoyaltyEarned: { type: Number, default: 0 },
    royaltyPaid: { type: Number, default: 0 },
    royaltyPending: { type: Number, default: 0 },
    lastRoyaltyPayoutDate: { type: Date, default: null },
    printPartner: { type: String, default: null, trim: true },
    availableOn: { type: [String], default: [] },
  },
  { timestamps: true }
);

bookSchema.index({ author: 1, status: 1 });
bookSchema.index({ title: 'text', isbn: 'text' });

bookSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    sourceBookId: this.sourceBookId,
    author: this.author?.toString?.() || this.author,
    title: this.title,
    isbn: this.isbn,
    genre: this.genre,
    publicationDate: this.publicationDate,
    status: this.status,
    mrp: this.mrp,
    authorRoyaltyPerCopy: this.authorRoyaltyPerCopy,
    totalCopiesSold: this.totalCopiesSold,
    totalRoyaltyEarned: this.totalRoyaltyEarned,
    royaltyPaid: this.royaltyPaid,
    royaltyPending: this.royaltyPending,
    lastRoyaltyPayoutDate: this.lastRoyaltyPayoutDate,
    printPartner: this.printPartner,
    availableOn: this.availableOn,
  };
};

export const Book = mongoose.model('Book', bookSchema);
