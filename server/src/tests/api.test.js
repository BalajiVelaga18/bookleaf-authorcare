import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Author, Book, Ticket, TicketMessage, ActivityLog, AIUsageLog } from '../models/index.js';
import { hashPassword } from '../utils/passwordService.js';

const TEST_DB_URI = process.env.TEST_MONGODB_URI;

let authorToken = '';
let adminToken = '';
let authorId = '';
let bookId = '';
let ticketId = '';

const describeIfDb = TEST_DB_URI ? describe : describe.skip;

describeIfDb('BookLeaf AuthorCare API', () => {
  beforeAll(async () => {
    process.env.MONGODB_URI = TEST_DB_URI;
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await Promise.all([
      Author.deleteMany({}),
      Book.deleteMany({}),
      Ticket.deleteMany({}),
      TicketMessage.deleteMany({}),
      ActivityLog.deleteMany({}),
      AIUsageLog.deleteMany({}),
    ]);

    const author = await Author.create({
      sourceAuthorId: 'AUTH_TEST',
      name: 'Test Author',
      email: 'author@test.com',
      passwordHash: await hashPassword('Author@123'),
      role: 'author',
    });
    authorId = author._id.toString();

    const admin = await Author.create({
      sourceAuthorId: 'ADMIN_TEST',
      name: 'Test Admin',
      email: 'admin@test.com',
      passwordHash: await hashPassword('Admin@123'),
      role: 'admin',
    });

    const book = await Book.create({
      sourceBookId: 'BK_TEST',
      author: author._id,
      title: 'Test Book',
      isbn: '978-0-TEST',
      status: 'Published & Live',
      mrp: 399,
      totalCopiesSold: 100,
      totalRoyaltyEarned: 3000,
      royaltyPaid: 1000,
      royaltyPending: 2000,
    });
    bookId = book._id.toString();

    const loginAuthor = await request(app).post('/api/v1/auth/login').send({ email: 'author@test.com', password: 'Author@123' });
    authorToken = loginAuthor.body.data ? `Bearer ${loginAuthor.headers['set-cookie']?.[0]}` : '';

    const loginAdmin = await request(app).post('/api/v1/auth/login').send({ email: 'admin@test.com', password: 'Admin@123' });
    adminToken = loginAdmin.body.data ? `Bearer ${loginAdmin.headers['set-cookie']?.[0]}` : '';
  });

  it('should reject invalid login', async () => {
    if (!TEST_DB_URI) return;
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'author@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should login author and return cookie', async () => {
    if (!TEST_DB_URI) return;
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'author@test.com', password: 'Author@123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('author');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should protect author routes from unauthenticated users', async () => {
    const res = await request(app).get('/api/v1/author/dashboard');
    expect(res.status).toBe(401);
  });

  it('should enforce role-based authorization', async () => {
    if (!TEST_DB_URI) return;
    // Author cannot access admin routes
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: 'author@test.com', password: 'Author@123' });
    const res = await agent.get('/api/v1/admin/dashboard');
    expect(res.status).toBe(403);
  });

  it('should retrieve author books', async () => {
    if (!TEST_DB_URI) return;
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: 'author@test.com', password: 'Author@123' });
    const res = await agent.get('/api/v1/author/books');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Test Book');
  });

  it('should create a ticket without AI', async () => {
    if (!TEST_DB_URI) return;
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: 'author@test.com', password: 'Author@123' });
    const res = await agent.post('/api/v1/author/tickets').send({
      bookId,
      subject: 'Royalty question',
      description: 'I have not received my royalty payment for the last quarter. Please check.',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.reference).toMatch(/^BL-/);
    ticketId = res.body.data.id;
  });

  it('should prevent authors from accessing other authors tickets', async () => {
    if (!TEST_DB_URI) return;
    const otherAuthor = await Author.create({
      sourceAuthorId: 'AUTH_OTHER',
      name: 'Other Author',
      email: 'other@test.com',
      passwordHash: await hashPassword('Author@123'),
      role: 'author',
    });
    const otherTicket = await Ticket.create({
      reference: 'BL-TEST-0001',
      author: otherAuthor._id,
      subject: 'Other ticket',
      description: 'Private',
    });

    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: 'author@test.com', password: 'Author@123' });
    const res = await agent.get(`/api/v1/author/tickets/${otherTicket._id}`);
    expect(res.status).toBe(404);
  });

  it('should allow admin to view all tickets and add internal notes not visible to author', async () => {
    if (!TEST_DB_URI) return;
    const ticket = await Ticket.create({
      reference: 'BL-TEST-0002',
      author: authorId,
      subject: 'Test ticket',
      description: 'Test description',
    });

    const adminAgent = request.agent(app);
    await adminAgent.post('/api/v1/auth/login').send({ email: 'admin@test.com', password: 'Admin@123' });

    const noteRes = await adminAgent.post(`/api/v1/admin/tickets/${ticket._id}/notes`).send({ body: 'Internal note' });
    expect(noteRes.status).toBe(201);

    const authorAgent = request.agent(app);
    await authorAgent.post('/api/v1/auth/login').send({ email: 'author@test.com', password: 'Author@123' });
    const authorDetail = await authorAgent.get(`/api/v1/author/tickets/${ticket._id}`);
    expect(authorDetail.body.data.messages.length).toBe(0);
  });

  it('should validate ticket creation input', async () => {
    if (!TEST_DB_URI) return;
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: 'author@test.com', password: 'Author@123' });
    const res = await agent.post('/api/v1/author/tickets').send({ subject: 'Hi', description: 'Short' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
