# BookLeaf AuthorCare Architecture

## Frontend/backend separation

The project is a classic decoupled SPA + REST API:

- **Client (`client/`):** React 19 + Vite SPA. Uses React Router for role-based routing, Axios for API calls (with credentials), and Tailwind CSS for a cohesive design system.
- **Server (`server/`):** Express API under `/api/v1`. Stateless except for in-memory SSE client subscriptions; all persistent data lives in MongoDB Atlas.

## Database relationships

- **Author** — core user entity. Can be `author` or `admin`.
- **Book** — belongs to one Author. Stores all provided financial and publication fields, preserving nulls.
- **Ticket** — belongs to an Author and optionally a Book. Stores AI classification, admin overrides, assignment, status, and activity timestamps.
- **TicketMessage** — belongs to a Ticket and a sender. Visibility is either `public` (visible to author and admin) or `internal` (admin only).
- **ActivityLog** — append-only record of ticket lifecycle events.
- **AIUsageLog** — tracks Gemini calls, success/failure, tokens, and latency.

## Authentication and authorization

- Passwords are hashed with bcrypt (12 rounds).
- On login, a JWT is signed and returned in an `httpOnly`, `Secure` (production), `SameSite` cookie.
- Middleware authenticates the token, loads the user, and enforces role checks.
- All resource access is server-side verified: authors can only access their own books/tickets/messages.
- Admins can access all resources but internal notes are never returned to author endpoints.

## Ticket lifecycle

1. Author creates a ticket.
2. Server persists the ticket and attempts Gemini classification asynchronously.
3. AI result (if any) is stored; admin can override category/priority.
4. Admin assigns ticket, adds internal notes, generates AI draft, and sends public reply.
5. Status moves Open → In Progress → Resolved → Closed.
6. Every state change and message triggers SSE events to the author and admin clients.

## Gemini request flow

1. Controller calls `geminiService.classifyTicket()` or `draftResponse()`.
2. Service builds a prompt with only the relevant ticket/book context and knowledge-base sections.
3. Request uses structured JSON output with a strict Zod-style schema enforced by the Gemini SDK.
4. On success, the result is parsed and persisted; on failure, a fallback response is returned.
5. `AIUsageLog` records the call regardless of outcome.

## Real-time update flow

- Clients connect to `/api/sse/events` with credentials.
- Server maintains a `Map<userId | 'admin', EventSource[]>`.
- When a ticket is created, updated, or replied to, the server broadcasts events:
  - `ticket:created` to admins
  - `ticket:updated` to the owning author and admins
- Subscribers refetch ticket data on events.
- Reconnect logic handles dropped connections with a 5-second backoff.

## Error handling and fallback

- Centralized error handler returns consistent JSON without leaking stack traces in production.
- AI failures are caught and logged; ticket creation and manual workflows continue.
- Database connection errors are surfaced clearly at startup.

## Key technical trade-offs

- **SSE vs WebSockets:** SSE was chosen because the traffic is mostly server-to-client broadcasts, avoiding WebSocket complexity and firewall issues.
- **JWT in cookies vs localStorage:** Cookies were chosen for XSS resistance; CSRF is mitigated by `SameSite` and CORS origin restrictions.
- **No file uploads:** Attachment UI is provided but upload/storage is documented as a future enhancement.
- **MongoDB Atlas vs local:** Atlas is used for portability between local dev and deployment.
