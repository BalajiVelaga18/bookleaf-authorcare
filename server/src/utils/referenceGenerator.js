import { Ticket } from '../models/index.js';

export async function generateTicketReference() {
  const date = new Date();
  const prefix = 'BL';
  const yymm = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const day = String(date.getDate()).padStart(2, '0');

  for (let attempt = 0; attempt < 10; attempt++) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const reference = `${prefix}-${yymm}${day}-${random}`;
    const existing = await Ticket.findOne({ reference });
    if (!existing) return reference;
  }
  throw new Error('Unable to generate unique ticket reference');
}
