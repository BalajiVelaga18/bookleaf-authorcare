import { config } from './config/index.js';

export const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export const ROLES = ['author', 'admin'];

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: config.env === 'production' ? 'none' : 'lax',
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
};

export const PUBLIC_MESSAGE = 'public';
export const INTERNAL_NOTE = 'internal';
