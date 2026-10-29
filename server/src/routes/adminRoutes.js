import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate, loadUser, requireAdminUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ticketQuerySchema, updateTicketSchema, addMessageSchema, assignTicketSchema } from '../validators/index.js';

const router = Router();

router.use(authenticate, loadUser, requireAdminUser);

router.get('/dashboard', adminController.getDashboard);
router.get('/authors', adminController.getAuthors);
router.get('/tickets', validate(ticketQuerySchema, 'query'), adminController.getTickets);
router.get('/tickets/:ticketId', adminController.getTicketById);
router.patch('/tickets/:ticketId', validate(updateTicketSchema), adminController.updateTicket);
router.post('/tickets/:ticketId/classify', adminController.classifyTicketAdmin);
router.post('/tickets/:ticketId/draft-response', adminController.draftResponseAdmin);
router.post('/tickets/:ticketId/assign', validate(assignTicketSchema), adminController.assignTicket);
router.post('/tickets/:ticketId/messages', validate(addMessageSchema), adminController.addMessage);
router.post('/tickets/:ticketId/notes', validate(addMessageSchema), adminController.addInternalNote);

export default router;
