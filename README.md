# BookLeaf AuthorCare — Intelligent Author Support Portal

A production-minded full-stack web application built for the BookLeaf Full Stack Developer technical assignment. It provides an **Author Portal** for authors to manage books, royalties, and support tickets, and an **Admin Portal** for support staff to manage tickets with Google Gemini AI-assisted classification and response drafting.

> **Note on source materials:** The assignment PDF (`BookLeaf_Technical_Assignment_1.pdf`) could not be read by the model used in this environment. Implementation is based on the complete requirements provided in the task prompt and the supplied `bookleaf_sample_data.json` dataset.

## Feature list

### Author Portal
- Secure login with seeded author accounts
- Personal dashboard with book count, copies sold, royalties earned/paid/pending (INR)
- Publication status overview and recent tickets
- Searchable, filterable book library with detailed book view
- Support ticket submission with book selection and validation
- Ticket history with status, priority, category, and conversation timeline
- Real-time ticket conversation updates via SSE

### Admin Portal
- Secure login with seeded admin account
- Operations dashboard with metrics, charts, and oldest unresolved tickets
- Professional ticket queue with search, filters, sorting, and pagination
- Ticket workspace with author/book context, public replies, internal notes
- Status, category, priority, and assignment controls
- AI-powered ticket classification and priority assessment
- AI-drafted response generation grounded in BookLeaf knowledge base
- Activity timeline and audit trail

### Engineering
- Node.js + Express REST API under `/api/v1`
- MongoDB Atlas with Mongoose ODM
- JWT authentication in httpOnly cookies
- bcrypt password hashing
- Zod request validation
- Rate limiting on auth and global routes
- Helmet security headers, CORS, centralized error handling
- Server-Sent Events for real-time updates
- Comprehensive seeding script for the provided dataset
- Backend test suite with Vitest + Supertest

## Technology stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, React Router, Tailwind CSS, Framer Motion, Recharts, React Hook Form, Zod, Axios, Lucide React |
| Backend | Node.js, Express, MongoDB Atlas, Mongoose, JWT, bcryptjs, Zod, Helmet, express-rate-limit, @google/genai |
| AI | Google Gemini API via `@google/genai` SDK |
| Real-time | Server-Sent Events (SSE) |
| Testing | Vitest, Supertest |

## Architecture overview

```text
bookleaf-authorcare/
├── client/              # React frontend
├── server/              # Express API
│   ├── src/config       # Environment & DB config
│   ├── src/controllers  # Route controllers (auth, author, admin, sse)
│   ├── src/middleware   # Auth, validation, rate limit, error handling
│   ├── src/models       # Mongoose schemas
│   ├── src/routes       # API route definitions
│   ├── src/services/ai  # Gemini integration
│   ├── src/knowledge-base # BookLeaf policy KB
│   ├── src/validators   # Zod schemas
│   ├── src/utils        # Helpers (tokens, passwords, broadcasting)
│   └── src/scripts      # Dataset seeding
├── docs/                # Architecture & submission docs
└── bookleaf_sample_data.json
```

## Environment variables

Copy `.env.example` to `server/.env` (and `client/.env` for frontend API URL if needed):

```bash
cp .env.example server/.env
```

Key variables:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `COOKIE_SECRET` | Secret for cookie-parser |
| `CLIENT_URL` | Frontend origin for CORS |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded admin credentials |
| `DEMO_AUTHOR_PASSWORD` | Seeded author account password |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Gemini model ID (e.g. `gemini-2.0-flash`) |
| `AI_ENABLED` | Toggle AI integration |
| `AI_TIMEOUT_MS` / `AI_MAX_RETRIES` | Gemini reliability settings |

## Local setup instructions

1. Install dependencies:
```bash
npm run install:all
```

2. Configure environment variables in `server/.env`.

3. Seed the database:
```bash
npm run seed
```

4. Start the backend:
```bash
npm run dev:server
```

5. Start the frontend:
```bash
npm run dev:client
```

6. Open `http://localhost:5173` and log in.

## MongoDB Atlas setup

1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user and whitelist your IP.
3. Get the connection string and set `MONGODB_URI`.
4. The application uses the database name in the URI (e.g. `bookleaf_authorcare`).

## How to obtain and configure a Gemini API key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create an API key for your project.
3. Set `GEMINI_API_KEY` and choose a model your account can access (e.g. `gemini-2.0-flash`).
4. Set `AI_ENABLED=true`.
5. If the key is missing, ticket creation and manual replies continue to work; AI features show a clear unavailable state.

## How to seed the sample dataset

```bash
npm run seed
```

The script:
- Imports all 10 authors and 18 books from `bookleaf_sample_data.json`
- Preserves source IDs, null values, and numeric figures
- Creates the admin account and demo author passwords
- Is idempotent: rerunning does not duplicate authors/books or delete tickets

## Demo login credentials

After seeding:

- **Admin:** `admin@bookleaf.test` / `Admin@123`
- **Author:** `priya.sharma@email.com` / `Author@123` (or any seeded author email with `DEMO_AUTHOR_PASSWORD`)

> **Note:** Change default passwords via environment variables before deploying.

## API endpoint documentation

### Authentication
- `POST /api/v1/auth/login` — email/password login, sets JWT cookie
- `POST /api/v1/auth/logout` — clears JWT cookie
- `GET /api/v1/auth/me` — current authenticated user

### Author
- `GET /api/v1/author/dashboard`
- `GET /api/v1/author/books`
- `GET /api/v1/author/books/:bookId`
- `GET /api/v1/author/tickets`
- `POST /api/v1/author/tickets`
- `GET /api/v1/author/tickets/:ticketId`
- `POST /api/v1/author/tickets/:ticketId/messages`

### Admin
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/authors`
- `GET /api/v1/admin/tickets`
- `GET /api/v1/admin/tickets/:ticketId`
- `PATCH /api/v1/admin/tickets/:ticketId`
- `POST /api/v1/admin/tickets/:ticketId/classify`
- `POST /api/v1/admin/tickets/:ticketId/draft-response`
- `POST /api/v1/admin/tickets/:ticketId/messages`
- `POST /api/v1/admin/tickets/:ticketId/notes`
- `POST /api/v1/admin/tickets/:ticketId/assign`

### Real-time & utility
- `GET /api/sse/events` — Server-Sent Events stream
- `GET /api/health` — health check
- `GET /api/ai-status` — AI availability metadata

## AI prompt strategy

- **Classification prompt:** system instructions + BookLeaf policies + ticket subject/description/book context. Output is enforced JSON with category, priority, rationale, confidence, and missing info.
- **Draft prompt:** system instructions + relevant knowledge-base sections + verified book/author facts + previous public messages. Output is enforced JSON with subject, body, next step, and timeline.
- Prompts treat user content as untrusted data and do not allow it to override schema or policies.
- Only the current ticket's relevant context is sent to Gemini; the full database is never transmitted.

## AI fallback and error-handling behavior

- Ticket creation never fails because of AI unavailability.
- If classification fails, the ticket is saved with `aiCategory = null` and can be classified manually.
- If draft generation fails, admins can write and send manual replies.
- Timeouts, retries with backoff, and structured-output validation are implemented.
- AI usage is logged for traceability.

## AI cost-management decisions

- Short, targeted prompts with only relevant knowledge-base sections.
- Limited conversation history (last 3 public messages) for drafts.
- Classification is performed once per ticket and persisted.
- Model and prompt versions are recorded on tickets.
- Token usage is logged when the API returns it.
- Reasonable timeout (15s) and limited retries (2).

## Testing instructions

Backend tests:
```bash
# Set a dedicated test database URI before running tests
$env:TEST_MONGODB_URI="your-test-mongodb-uri"   # PowerShell
# or
export TEST_MONGODB_URI="your-test-mongodb-uri" # Unix
npm run test:server
```

> Tests are skipped if `TEST_MONGODB_URI` is not set, to avoid failures when no database is available.

Manual verification checklist:
1. Author login → view only own books
2. Create a support ticket
3. Admin login → ticket appears in queue
4. AI classification/priority persisted (if configured)
5. Admin overrides category/priority
6. Generate, edit, and send AI draft
7. Author sees reply without refresh
8. Internal notes never visible to author
9. Status changes work
10. Author cannot access another author's ticket

## Deployment instructions

### Frontend (Vercel)
1. Push repository to a private Git repo.
2. Import into Vercel.
3. Set build command: `npm run build --prefix client`
4. Set output directory: `client/dist`
5. Add environment variable `VITE_API_URL` pointing to your backend.

### Backend (Render / Railway)
1. Add the Node.js service from the `server/` directory.
2. Set all environment variables from `.env.example`.
3. Use start command: `node src/server.js` (runs from `server/`).
4. Add a MongoDB Atlas connection string.
5. Configure CORS `CLIENT_URL` to match your deployed frontend.
6. Run seed script once against the production database.

### Health check
Use `GET /api/health` for uptime monitoring.

## Known limitations and future improvements

- File attachments have a UI placeholder but upload/storage is not implemented.
- Email notifications are not implemented; real-time updates rely on SSE.
- Advanced analytics (e.g. agent performance) can be expanded.
- Ticket assignment currently supports self-assignment; multi-admin reassignment can be added.
- CSRF token rotation can be added for additional hardening.

## Confidentiality

This repository is intended to remain private per the assignment requirements. Do not commit real credentials or sensitive data.
