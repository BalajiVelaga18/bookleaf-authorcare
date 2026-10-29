import { Book, Ticket, TicketMessage, ActivityLog } from '../models/index.js';
import { generateTicketReference } from '../utils/referenceGenerator.js';
import { classifyTicket, isAIConfigured } from '../services/ai/geminiService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { broadcastToAuthor, broadcastToAdmins } from '../utils/broadcast.js';

export async function getDashboard(req, res) {
  const authorId = req.user._id;
  const books = await Book.find({ author: authorId });

  const totalBooks = books.length;
  const totalCopiesSold = books.reduce((sum, b) => sum + (b.totalCopiesSold || 0), 0);
  const totalRoyaltyEarned = books.reduce((sum, b) => sum + (b.totalRoyaltyEarned || 0), 0);
  const royaltyPaid = books.reduce((sum, b) => sum + (b.royaltyPaid || 0), 0);
  const royaltyPending = books.reduce((sum, b) => sum + (b.royaltyPending || 0), 0);

  const statusCounts = {};
  books.forEach((b) => {
    const status = b.status || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const recentTickets = await Ticket.find({ author: authorId })
    .sort({ lastActivityAt: -1 })
    .limit(5)
    .select('reference subject status category priority lastActivityAt createdAt');

  return res.json(successResponse({
    author: req.user.toPublicJSON(),
    summary: {
      totalBooks,
      totalCopiesSold,
      totalRoyaltyEarned,
      royaltyPaid,
      royaltyPending,
      statusCounts,
    },
    recentTickets,
  }));
}

export async function getBooks(req, res) {
  const authorId = req.user._id;
  const { page, limit, status, search } = req.queryValidated;
  const query = { author: authorId };
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { isbn: { $regex: search, $options: 'i' } },
      { genre: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [books, total] = await Promise.all([
    Book.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Book.countDocuments(query),
  ]);

  return res.json({
    success: true,
    data: books.map((b) => b.toPublicJSON()),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function getBookById(req, res) {
  const authorId = req.user._id;
  const book = await Book.findOne({ _id: req.params.bookId, author: authorId });
  if (!book) {
    return res.status(404).json(errorResponse('Book not found', null, 404));
  }
  return res.json(successResponse(book.toPublicJSON()));
}

export async function getTickets(req, res) {
  const authorId = req.user._id;
  const { page, limit, status, search, sortBy, order } = req.queryValidated;
  const query = { author: authorId };
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { reference: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const sortField = sortBy === 'priority' ? 'aiPriority' : sortBy;
  const sortOrder = order === 'asc' ? 1 : -1;
  const skip = (page - 1) * limit;

  const [tickets, total] = await Promise.all([
    Ticket.find(query).populate('book', 'title').sort({ [sortField]: sortOrder, createdAt: -1 }).skip(skip).limit(limit),
    Ticket.countDocuments(query),
  ]);

  return res.json({
    success: true,
    data: tickets.map((t) => ({ ...t.toPublicJSON(), bookTitle: t.book?.title })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

export async function getTicketById(req, res) {
  const authorId = req.user._id;
  const ticket = await Ticket.findOne({ _id: req.params.ticketId, author: authorId }).populate('book', 'title isbn status');
  if (!ticket) {
    return res.status(404).json(errorResponse('Ticket not found', null, 404));
  }
  const messages = await TicketMessage.find({ ticket: ticket._id, visibility: 'public' })
    .sort({ createdAt: 1 })
    .populate('sender', 'name role');

  return res.json(successResponse({
    ticket: ticket.toPublicJSON(),
    messages: messages.map((m) => ({
      id: m._id.toString(),
      sender: { id: m.sender._id.toString(), name: m.sender.name, role: m.sender.role },
      body: m.body,
      visibility: m.visibility,
      createdAt: m.createdAt,
    })),
  }));
}

export async function createTicket(req, res) {
  const authorId = req.user._id;
  const { bookId, subject, description } = req.bodyValidated;

  let book = null;
  if (bookId) {
    book = await Book.findOne({ _id: bookId, author: authorId });
    if (!book) {
      return res.status(404).json(errorResponse('Selected book not found', null, 404));
    }
  }

  const reference = await generateTicketReference();
  const ticket = await Ticket.create({
    reference,
    author: authorId,
    book: book?._id || null,
    subject,
    description,
  });

  // Attempt AI classification asynchronously; do not block ticket creation
  if (isAIConfigured()) {
    try {
      const bookContext = book
        ? `${book.title} | ${book.status || 'N/A'} | ₹${book.mrp ?? 'N/A'} | ₹${book.royaltyPending ?? 0} pending`
        : null;
      const aiResult = await classifyTicket({
        subject,
        description,
        bookContext,
        ticketId: ticket._id,
      });

      if (aiResult.success) {
        ticket.aiCategory = aiResult.data.category;
        ticket.aiPriority = aiResult.data.priority;
        ticket.aiRationale = aiResult.data.categoryRationale;
        ticket.aiPriorityRationale = aiResult.data.priorityRationale;
        ticket.aiConfidence = aiResult.data.confidence;
        ticket.aiMissingInfo = aiResult.data.missingInfo || [];
        ticket.aiModel = aiResult.model;
        ticket.aiProcessedAt = new Date();
        await ticket.save();
      }
    } catch (err) {
      console.error('AI classification failed:', err.message);
    }
  }

  await ActivityLog.create({
    ticket: ticket._id,
    actor: authorId,
    actorRole: 'author',
    action: 'ticket_created',
    metadata: { category: ticket.aiCategory, priority: ticket.aiPriority },
  });

  broadcastToAdmins('ticket:created', { ticket: ticket.toPublicJSON() });

  return res.status(201).json(successResponse(ticket.toPublicJSON(), 'Ticket created successfully'));
}

export async function addMessage(req, res) {
  const authorId = req.user._id;
  const { body } = req.bodyValidated;
  const ticket = await Ticket.findOne({ _id: req.params.ticketId, author: authorId });
  if (!ticket) {
    return res.status(404).json(errorResponse('Ticket not found', null, 404));
  }
  if (ticket.status === 'Closed') {
    return res.status(400).json(errorResponse('Cannot reply to a closed ticket', null, 400));
  }

  const message = await TicketMessage.create({
    ticket: ticket._id,
    sender: authorId,
    senderRole: 'author',
    body,
    visibility: 'public',
  });

  ticket.lastActivityAt = new Date();
  await ticket.save();

  await ActivityLog.create({
    ticket: ticket._id,
    actor: authorId,
    actorRole: 'author',
    action: 'message_added',
  });

  broadcastToAuthor(authorId.toString(), 'ticket:updated', { ticketId: ticket._id.toString(), type: 'message' });
  broadcastToAdmins('ticket:updated', { ticketId: ticket._id.toString(), type: 'message' });

  return res.status(201).json(successResponse({
    message: {
      id: message._id.toString(),
      sender: { id: authorId.toString(), name: req.user.name, role: 'author' },
      body: message.body,
      visibility: message.visibility,
      createdAt: message.createdAt,
    },
  }, 'Message added'));
}
