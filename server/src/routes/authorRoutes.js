import { Router } from 'express';
import * as authorController from '../controllers/authorController.js';
import { authenticate, loadUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTicketSchema, addMessageSchema, authorTicketQuerySchema, bookQuerySchema } from '../validators/index.js';

const router = Router();

router.use(authenticate, loadUser);

router.get('/dashboard', authorController.getDashboard);
router.get('/books', validate(bookQuerySchema, 'query'), authorController.getBooks);
router.get('/books/:bookId', authorController.getBookById);
router.get('/tickets', validate(authorTicketQuerySchema, 'query'), authorController.getTickets);
router.post('/tickets', validate(createTicketSchema), authorController.createTicket);
router.get('/tickets/:ticketId', authorController.getTicketById);
router.post('/tickets/:ticketId/messages', validate(addMessageSchema), authorController.addMessage);

export default router;
