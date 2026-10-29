import { z } from 'zod';
import { CATEGORIES, PRIORITIES, STATUSES } from '../constants.js';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['author', 'admin']).default('author'),
  adminKey: z.string().optional(),
});

export const createTicketSchema = z.object({
  bookId: z.string().nullable().optional(),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200, 'Subject too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
});

export const addMessageSchema = z.object({
  body: z.string().min(1, 'Message is required').max(5000, 'Message too long'),
});

export const updateTicketSchema = z.object({
  status: z.enum(STATUSES).optional(),
  adminCategory: z.enum(CATEGORIES).optional(),
  adminPriority: z.enum(PRIORITIES).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

export const assignTicketSchema = z.object({
  adminId: z.string().optional(),
});

export const ticketQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lastActivityAt', 'priority']).default('lastActivityAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const authorTicketQuerySchema = ticketQuerySchema.omit({ category: true });

export const bookQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  search: z.string().optional(),
});
