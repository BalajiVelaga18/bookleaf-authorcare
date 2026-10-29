import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Author, Book } from '../models/index.js';
import { hashPassword } from '../utils/passwordService.js';
import { config } from '../config/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_PATH = path.resolve(__dirname, '..', '..', '..', 'bookleaf_sample_data.json');

async function seed() {
  await connectDatabase();

  const filePath = process.env.SAMPLE_DATA_PATH || DEFAULT_DATA_PATH;
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    console.error('Could not read bookleaf_sample_data.json:', err.message);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error('Invalid JSON in sample data:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(data.authors)) {
    console.error('Sample data must contain an authors array');
    process.exit(1);
  }

  const summary = { authorsCreated: 0, authorsExisting: 0, booksCreated: 0, booksExisting: 0, malformed: [] };

  // Seed or update admin
  let admin = await Author.findOne({ email: config.adminEmail.toLowerCase() });
  if (!admin) {
    admin = await Author.create({
      sourceAuthorId: 'ADMIN001',
      name: 'BookLeaf Admin',
      email: config.adminEmail.toLowerCase(),
      passwordHash: await hashPassword(config.adminPassword),
      role: 'admin',
      isActive: true,
    });
    console.log(`Admin created: ${admin.email}`);
  } else {
    admin.passwordHash = await hashPassword(config.adminPassword);
    await admin.save();
    console.log(`Admin password updated: ${admin.email}`);
  }

  for (const authorData of data.authors) {
    try {
      const { author_id, name, email, phone, city, joined_date, books } = authorData;
      if (!author_id || !name || !email) {
        summary.malformed.push({ author_id, reason: 'Missing required author fields' });
        continue;
      }

      let author = await Author.findOne({ sourceAuthorId: author_id });
      if (!author) {
        author = await Author.create({
          sourceAuthorId: author_id,
          name,
          email: email.toLowerCase(),
          phone: phone || null,
          city: city || null,
          joinedDate: joined_date ? new Date(joined_date) : null,
          passwordHash: await hashPassword(config.demoAuthorPassword),
          role: 'author',
          isActive: true,
        });
        summary.authorsCreated++;
      } else {
        summary.authorsExisting++;
      }

      if (!Array.isArray(books)) continue;

      for (const bookData of books) {
        try {
          const existingBook = await Book.findOne({ sourceBookId: bookData.book_id });
          if (existingBook) {
            summary.booksExisting++;
            continue;
          }

          await Book.create({
            sourceBookId: bookData.book_id,
            author: author._id,
            title: bookData.title,
            isbn: bookData.isbn ?? null,
            genre: bookData.genre ?? null,
            publicationDate: bookData.publication_date ? new Date(bookData.publication_date) : null,
            status: bookData.status ?? null,
            mrp: bookData.mrp ?? null,
            authorRoyaltyPerCopy: bookData.author_royalty_per_copy ?? null,
            totalCopiesSold: bookData.total_copies_sold ?? 0,
            totalRoyaltyEarned: bookData.total_royalty_earned ?? 0,
            royaltyPaid: bookData.royalty_paid ?? 0,
            royaltyPending: bookData.royalty_pending ?? 0,
            lastRoyaltyPayoutDate: bookData.last_royalty_payout_date ? new Date(bookData.last_royalty_payout_date) : null,
            printPartner: bookData.print_partner ?? null,
            availableOn: Array.isArray(bookData.available_on) ? bookData.available_on : [],
          });
          summary.booksCreated++;
        } catch (bookErr) {
          summary.malformed.push({ book_id: bookData.book_id, reason: bookErr.message });
        }
      }
    } catch (authorErr) {
      summary.malformed.push({ author_id: authorData.author_id, reason: authorErr.message });
    }
  }

  console.log('\n=== Seed Summary ===');
  console.log(`Authors created: ${summary.authorsCreated}`);
  console.log(`Authors already existing: ${summary.authorsExisting}`);
  console.log(`Books created: ${summary.booksCreated}`);
  console.log(`Books already existing: ${summary.booksExisting}`);
  if (summary.malformed.length) {
    console.log(`Malformed records: ${summary.malformed.length}`);
    summary.malformed.forEach((m) => console.log(' -', m));
  }

  await disconnectDatabase();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
