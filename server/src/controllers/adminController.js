import mongoose from 'mongoose';
import { Author, Book, Ticket, TicketMessage, ActivityLog } from '../models/index.js';
import { draftResponse, classifyTicket, isAIConfigured } from '../services/ai/geminiService.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse.js';
import { broadcastToAuthor, broadcastToAdmins } from '../utils/broadcast.js';

export async function getDashboard(req, res) {
  const total = await Ticket.countDocuments();
  const open = await Ticket.countDocuments({ status: 'Open' });
  const inProgress = await Ticket.countDocuments({ status: 'In Progress' });
  const resolved = await Ticket.countDocuments({ status: 'Resolved' });
  const closed = await Ticket.countDocuments({ status: 'Closed' });

  const priorityCounts = await Ticket.aggregate([
    { $match: { status: { $in: ['Open', 'In Progress'] } } },
    {
      $addFields: {
        effectivePriority: { $ifNull: ['$adminPriority', '$aiPriority', 'Medium'] },
      },
    },
    { $group: { _id: '$effectivePriority', count: { $sum: 1 } } },
  ]);

  const categoryCounts = await Ticket.aggregate([
    {
      $addFields: {
        effectiveCategory: { $ifNull: ['$adminCategory', '$aiCategory', 'General Inquiry'] },
      },
    },
    { $group: { _id: '$effectiveCategory', count: { $sum: 1 } } },
  ]);

  const volumeByDay = await Ticket.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 30 },
  ]);

  const oldestUnresolved = await Ticket.find({ status: { $in: ['Open', 'In Progress'] } })
    .sort({ createdAt: 1 })
    .limit(5)
    .populate('author', 'name email')
    .select('reference subject status aiPriority createdAt author');

  const resolvedTickets = await Ticket.find({
    status: { $in: ['Resolved', 'Closed'] },
    resolvedAt: { $ne: null },
  });
  let avgResolutionHours = null;
  if (resolvedTickets.length > 0) {
    const totalHours = resolvedTickets.reduce((sum, t) => {
      if (!t.resolvedAt || !t.createdAt) return sum;
      return sum + (t.resolvedAt - t.createdAt) / (1000 * 60 * 60);
    }, 0);
    avgResolutionHours = Math.round(totalHours / resolvedTickets.length);
  }

  return res.json(successResponse({
    counts: { total, open, inProgress, resolved, closed },
    priorityCounts: priorityCounts.map((p) => ({ priority: p._id, count: p.count })),
    categoryCounts: categoryCounts.map((c) => ({ category: c._id, count: c.count })),
    volumeByDay: volumeByDay.map((d) => ({ date: d._id, count: d.count })),
    oldestUnresolved: oldestUnresolved.map((t) => ({
      id: t._id.toString(),
      reference: t.reference,
      subject: t.subject,
      status: t.status,
      priority: t.adminPriority || t.aiPriority || 'Medium',
      authorName: t.author?.name,
      createdAt: t.createdAt,
    })),
    avgResolutionHours,
  }));
}

export async function getAuthors(req, res) {
  const authors = await Author.find({ role: 'author' }).select('-passwordHash').sort({ name: 1 });
  return res.json(successResponse(authors.map((a) => a.toPublicJSON())));
}

export async function getTickets(req, res) {
  const { page, limit, status, category, priority, search, sortBy, order } = req.queryValidated;
  const andConditions = [];
  if (status) andConditions.push({ status });
  if (category) {
    andConditions.push({ $or: [{ aiCategory: category }, { adminCategory: category }] });
  }
  if (priority) {
    andConditions.push({ $or: [{ aiPriority: priority }, { adminPriority: priority }] });
  }
  if (search) {
    const matchingAuthors = await Author.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');
    const matchingBooks = await Book.find({
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');

    andConditions.push({
      $or: [
        { reference: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { author: { $in: matchingAuthors.map((a) => a._id) } },
        { book: { $in: matchingBooks.map((b) => b._id) } },
      ],
    });
  }
  const query = andConditions.length > 0 ? { $and: andConditions } : {};

  const sortField = sortBy === 'priority'
    ? 'adminPriority'
    : sortBy === 'age'
    ? 'createdAt'
    : sortBy;
  const sortOrder = order === 'asc' ? 1 : -1;
  const skip = (page - 1) * limit;

  const [tickets, total] = await Promise.all([
    Ticket.find(query)
      .populate('author', 'name email')
      .populate('book', 'title isbn status')
      .populate('assignedTo', 'name')
      .sort({ [sortField]: sortOrder, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Ticket.countDocuments(query),
  ]);

  return res.json(paginatedResponse(
    tickets.map((t) => ({
      ...t.toPublicJSON(),
      authorName: t.author?.name,
      authorEmail: t.author?.email,
      bookTitle: t.book?.title,
      bookIsbn: t.book?.isbn,
      assignedToName: t.assignedTo?.name,
      ageHours: Math.round((Date.now() - t.createdAt) / (1000 * 60 * 60)),
    })),
    { page, limit, total, pages: Math.ceil(total / limit) }
  ));
}

export async function getTicketById(req, res) {
  const ticket = await Ticket.findById(req.params.ticketId)
    .populate('author', '-passwordHash')
    .populate('book')
    .populate('assignedTo', 'name email role');
  if (!ticket) {
    return res.status(404).json(errorResponse('Ticket not found', null, 404));
  }

  const publicMessages = await TicketMessage.find({ ticket: ticket._id, visibility: 'public' })
    .sort({ createdAt: 1 })
    .populate('sender', 'name role');
  const internalNotes = await TicketMessage.find({ ticket: ticket._id, visibility: 'internal' })
    .sort({ createdAt: 1 })
    .populate('sender', 'name role');
  const activity = await ActivityLog.find({ ticket: ticket._id })
    .sort({ createdAt: -1 })
    .populate('actor', 'name role');

  return res.json(successResponse({
    ticket: {
      ...ticket.toPublicJSON(),
      author: ticket.author?.toPublicJSON(),
      book: ticket.book?.toPublicJSON(),
      assignedTo: ticket.assignedTo ? { id: ticket.assignedTo._id.toString(), name: ticket.assignedTo.name } : null,
    },
    publicMessages: publicMessages.map((m) => ({
      id: m._id.toString(),
      sender: { id: m.sender._id.toString(), name: m.sender.name, role: m.sender.role },
      body: m.body,
      visibility: m.visibility,
      createdAt: m.createdAt,
    })),
    internalNotes: internalNotes.map((m) => ({
      id: m._id.toString(),
      sender: { id: m.sender._id.toString(), name: m.sender.name, role: m.sender.role },
      body: m.body,
      visibility: m.visibility,
      createdAt: m.createdAt,
    })),
    activity: activity.map((a) => ({
      id: a._id.toString(),
      actor: { name: a.actor.name, role: a.actor.role },
      action: a.action,
      metadata: a.metadata,
      createdAt: a.createdAt,
    })),
  }));
}

export async function updateTicket(req, res) {
  const { status, adminCategory, adminPriority } = req.bodyValidated;
  const ticket = await Ticket.findById(req.params.ticketId);
  if (!ticket) {
    return res.status(404).json(errorResponse('Ticket not found', null, 404));
  }

  const updates = {};
  if (status) {
    updates.status = status;
    if (status === 'Resolved') updates.resolvedAt = new Date();
    if (status === 'Open' || status === 'In Progress') updates.resolvedAt = null;
  }
  if (adminCategory) updates.adminCategory = adminCategory;
  if (adminPriority) updates.adminPriority = adminPriority;
  updates.lastActivityAt = new Date();

  Object.assign(ticket, updates);
  await ticket.save();

  await ActivityLog.create({
    ticket: ticket._id,
    actor: req.user._id,
    actorRole: 'admin',
    action: 'ticket_updated',
    metadata: updates,
  });

  broadcastToAuthor(ticket.author.toString(), 'ticket:updated', { ticketId: ticket._id.toString(), type: 'status' });
  broadcastToAdmins('ticket:updated', { ticketId: ticket._id.toString(), type: 'status' });

  return res.json(successResponse(ticket.toPublicJSON(), 'Ticket updated'));
}

export async function assignTicket(req, res) {
  const ticket = await Ticket.findById(req.params.ticketId);
  if (!ticket) {
    return res.status(404).json(errorResponse('Ticket not found', null, 404));
  }
  ticket.assignedTo = req.user._id;
  ticket.assignedAt = new Date();
  ticket.lastActivityAt = new Date();
  await ticket.save();

  await ActivityLog.create({
    ticket: ticket._id,
    actor: req.user._id,
    actorRole: 'admin',
    action: 'ticket_assigned',
    metadata: { assignedTo: req.user.name },
  });

  broadcastToAuthor(ticket.author.toString(), 'ticket:updated', { ticketId: ticket._id.toString(), type: 'assignment' });
  broadcastToAdmins('ticket:updated', { ticketId: ticket._id.toString(), type: 'assignment' });

  return res.json(successResponse(ticket.toPublicJSON(), 'Ticket assigned'));
}

export async function classifyTicketAdmin(req, res) {
  const ticket = await Ticket.findById(req.params.ticketId).populate('book');
  if (!ticket) {
    return res.status(404).json(errorResponse('Ticket not found', null, 404));
  }

  if (!isAIConfigured()) {
    return res.status(503).json(errorResponse('AI service not configured', null, 503));
  }

  const book = ticket.book;
  const bookContext = book
    ? `${book.title} | ${book.status || 'N/A'} | ₹${book.mrp ?? 'N/A'} | ₹${book.royaltyPending ?? 0} pending`
    : null;

  const result = await classifyTicket({
    subject: ticket.subject,
    description: ticket.description,
    bookContext,
    ticketId: ticket._id,
  });

  if (!result.success) {
    return res.status(503).json(errorResponse(result.error || 'Classification failed', null, 503));
  }

  ticket.aiCategory = result.data.category;
  ticket.aiPriority = result.data.priority;
  ticket.aiRationale = result.data.categoryRationale;
  ticket.aiPriorityRationale = result.data.priorityRationale;
  ticket.aiConfidence = result.data.confidence;
  ticket.aiMissingInfo = result.data.missingInfo || [];
  ticket.aiModel = result.model;
  ticket.aiProcessedAt = new Date();
  ticket.lastActivityAt = new Date();
  await ticket.save();

  broadcastToAdmins('ticket:updated', { ticketId: ticket._id.toString(), type: 'classification' });

  return res.json(successResponse(ticket.toPublicJSON(), 'Ticket classified'));
}

export async function draftResponseAdmin(req, res) {
  const ticket = await Ticket.findById(req.params.ticketId)
    .populate('author', '-passwordHash')
    .populate('book');
  if (!ticket) {
    return res.status(404).json(errorResponse('Ticket not found', null, 404));
  }

  if (!isAIConfigured()) {
    return res.status(503).json(errorResponse('AI service not configured', null, 503));
  }

  const previousMessages = await TicketMessage.find({ ticket: ticket._id, visibility: 'public' })
    .sort({ createdAt: 1 })
    .select('senderRole body createdAt');

  const result = await draftResponse({
    ticket,
    book: ticket.book,
    previousMessages,
    author: ticket.author,
    ticketId: ticket._id,
  });

  if (!result.success) {
    return res.status(503).json(errorResponse(result.error || 'Draft generation failed', null, 503));
  }

  return res.json(successResponse({
    draft: result.data,
    model: result.model,
  }));
}

export async function addMessage(req, res) {
  const { body } = req.bodyValidated;
  const ticket = await Ticket.findById(req.params.ticketId);
  if (!ticket) {
    return res.status(404).json(errorResponse('Ticket not found', null, 404));
  }
  if (ticket.status === 'Closed') {
    return res.status(400).json(errorResponse('Cannot reply to a closed ticket', null, 400));
  }

  const message = await TicketMessage.create({
    ticket: ticket._id,
    sender: req.user._id,
    senderRole: 'admin',
    body,
    visibility: 'public',
  });

  ticket.lastActivityAt = new Date();
  if (ticket.status === 'Open') ticket.status = 'In Progress';
  await ticket.save();

  await ActivityLog.create({
    ticket: ticket._id,
    actor: req.user._id,
    actorRole: 'admin',
    action: 'public_reply_sent',
  });

  broadcastToAuthor(ticket.author.toString(), 'ticket:updated', { ticketId: ticket._id.toString(), type: 'message' });
  broadcastToAdmins('ticket:updated', { ticketId: ticket._id.toString(), type: 'message' });

  return res.status(201).json(successResponse({
    message: {
      id: message._id.toString(),
      sender: { id: req.user._id.toString(), name: req.user.name, role: 'admin' },
      body: message.body,
      visibility: message.visibility,
      createdAt: message.createdAt,
    },
  }, 'Reply sent'));
}

export async function addInternalNote(req, res) {
  const { body } = req.bodyValidated;
  const ticket = await Ticket.findById(req.params.ticketId);
  if (!ticket) {
    return res.status(404).json(errorResponse('Ticket not found', null, 404));
  }

  const note = await TicketMessage.create({
    ticket: ticket._id,
    sender: req.user._id,
    senderRole: 'admin',
    body,
    visibility: 'internal',
  });

  ticket.lastActivityAt = new Date();
  await ticket.save();

  await ActivityLog.create({
    ticket: ticket._id,
    actor: req.user._id,
    actorRole: 'admin',
    action: 'internal_note_added',
  });

  broadcastToAdmins('ticket:updated', { ticketId: ticket._id.toString(), type: 'note' });

  return res.status(201).json(successResponse({
    note: {
      id: note._id.toString(),
      sender: { id: req.user._id.toString(), name: req.user.name, role: 'admin' },
      body: note.body,
      visibility: note.visibility,
      createdAt: note.createdAt,
    },
  }, 'Internal note added'));
}
