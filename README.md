# Mindspace

Mindspace is a private, calm mental-wellness platform built from the Product and Engineering Specification.

> Non-clinical wellness product: Mindspace does not diagnose, treat or replace professional care.

## Requirements

- Node.js 24+
- MongoDB Atlas or a local MongoDB-compatible test database
- Optional Groq API credentials

## Setup

```bash
npm install
cp server/.env.example server/.env
npm run dev
```

The client runs on Vite and the API runs on Express. Production settings require HTTPS and a trusted CORS origin.

## Security model

- Journal plaintext is encrypted in the browser with AES-256-GCM.
- A separate encryption passphrase derives an Argon2id KEK; a random DEK wraps encrypted journal payloads.
- The server stores ciphertext and encryption metadata only.
- Losing the encryption passphrase may make journal content permanently unrecoverable.
- AI credentials stay in server environment variables. Journal sharing requires explicit consent.
- Passwords use Argon2id. Sessions use HTTP-only cookies.

## Scripts

- `npm run dev` - run client and server
- `npm run build` - build both workspaces
- `npm run test` - run all tests
- `npm run lint` - run workspace lint scripts

## API overview

- `POST /api/auth/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password`
- `GET /api/auth/me`, `PUT /api/auth/encryption`
- `GET/POST /api/journals`, `PUT/DELETE /api/journals/:id`
- `GET/POST /api/moods`, `PUT/DELETE /api/moods/:id`
- `POST /api/ai/chat`
- `GET/POST /api/habits`, `PUT/DELETE /api/habits/:id`
- `POST /api/habits/logs`, `POST /api/habits/goals`
- `GET /api/insights/weekly`, `/api/insights/monthly`
- `GET/PUT /api/settings`, `DELETE /api/settings/account`

All mutating API routes require an authenticated session and CSRF token. User ownership is enforced in database queries.

## Privacy and operational limitations

- Journal and mood free-text ciphertext is stored only after browser encryption.
- The server never receives or stores the encryption passphrase or unwrapped DEK.
- Losing the encryption passphrase can make encrypted data permanently unrecoverable.
- AI chat is not persisted. Groq credentials are server-only. `MockProvider` is used locally when no key is configured.
- Groq is an external processor for explicitly shared chat text. This implementation does not claim verified provider retention settings.
- Password reset delivery requires a mail provider adapter before public launch.
- MongoDB Atlas is production storage; the test suite uses `mongodb-memory-server`.
- Account deletion purges owned application records immediately. Documented backup retention is up to 30 days.

## Implementation checklist

- [x] Phase 1: foundation and authentication
- [x] Phase 2: encryption and journal
- [x] Phase 3: mood tracking
- [x] Phase 4: AI companion and safety
- [x] Phase 5: dashboard and insights
- [x] Phase 6: habits and mindfulness
- [x] Phase 7: hardening and launch review
