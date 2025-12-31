# Feedora - Development Phases

This document outlines the phased implementation roadmap for the GitHub Activity Feed System.

---

## Phase 0: Foundation (MVP) ✅

**Status:** Complete

**Objective:** Set up the basic project structure and core functionality.

### Deliverables:
- [x] Project initialization with Express.js
- [x] Directory structure (`src/routes`, `src/services`, `src/store`)
- [x] In-memory activity store
- [x] GitHub event normalizer (Push, PR, Issue, Star)
- [x] Webhook receiver endpoint (`POST /webhook/github`)
- [x] Feed API endpoint (`GET /feed/:username`)
- [x] Health check endpoint
- [x] `.gitignore` configuration

### Files Created:
- `src/app.js`
- `src/store/activityStore.js`
- `src/services/eventNormalizer.js`
- `src/routes/webhook.routes.js`
- `src/routes/feed.routes.js`

---

## Phase 1: Security & Validation ✅

**Status:** Complete

**Objective:** Add security measures and input validation.

### Deliverables:
- [x] GitHub webhook signature verification (HMAC SHA-256)
- [x] Input validation middleware
- [x] Request payload sanitization
- [x] Environment variable configuration
- [x] Secure headers

### Files Created/Modified:
- `src/middleware/validateSignature.js`
- `src/middleware/validateInput.js`
- `src/config/index.js`
- `.env.example`

### Environment Variables:
```
GITHUB_WEBHOOK_SECRET=your_webhook_secret
PORT=3000
NODE_ENV=development
```

---

## Phase 2: Pagination & Filtering ✅

**Status:** Complete

**Objective:** Add cursor-based pagination and filtering capabilities.

### Deliverables:
- [x] Cursor-based pagination for feeds
- [x] Filter by event type
- [x] Filter by repository
- [x] Filter by date range
- [x] Sorting options (newest/oldest)

### API Changes:
```
GET /feed/:username?limit=20&cursor=xxx&type=PUSH&repo=owner/repo&sort=desc
```

### Response Format:
```json
{
  "username": "octocat",
  "activities": [...],
  "pagination": {
    "hasMore": true,
    "nextCursor": "base64_cursor",
    "total": 100
  }
}
```

---

## Phase 3: Logging & Error Handling ✅

**Status:** Complete

**Objective:** Add comprehensive logging and centralized error handling.

### Deliverables:
- [x] Structured logging with log levels
- [x] Request/response logging middleware
- [x] Centralized error handling
- [x] Custom error classes
- [x] Request ID tracking

### Files Created:
- `src/middleware/requestLogger.js`
- `src/middleware/errorHandler.js`
- `src/utils/logger.js`
- `src/utils/errors.js`

---

## Phase 4: Testing Suite ✅

**Status:** Complete

**Objective:** Add comprehensive testing coverage.

### Deliverables:
- [x] Unit tests for event normalizer
- [x] Unit tests for activity store
- [x] Integration tests for API endpoints
- [x] Test utilities and fixtures
- [x] npm test scripts

### Files Created:
- `tests/unit/eventNormalizer.test.js`
- `tests/unit/activityStore.test.js`
- `tests/integration/webhook.test.js`
- `tests/integration/feed.test.js`
- `tests/fixtures/webhookPayloads.js`

---

## Phase 5: Persistent Storage (Future)

**Status:** Planned

**Objective:** Replace in-memory store with MongoDB.

### Planned Deliverables:
- [ ] MongoDB connection setup
- [ ] Activity model with Mongoose
- [ ] Database indexes on `username + timestamp`
- [ ] Migration scripts
- [ ] Connection pooling

---

## Phase 6: Caching Layer (Future)

**Status:** Planned

**Objective:** Add Redis caching for hot feeds.

### Planned Deliverables:
- [ ] Redis connection setup
- [ ] Cache-aside pattern for feeds
- [ ] Cache invalidation on new activities
- [ ] TTL configuration

---

## Phase 7: Real-time Updates (Future)

**Status:** Planned

**Objective:** Add WebSocket/SSE support for live feeds.

### Planned Deliverables:
- [ ] WebSocket server setup
- [ ] Live feed subscriptions
- [ ] Event broadcasting
- [ ] Connection management

---

## Phase 8: Rate Limiting & Throttling (Future)

**Status:** Planned

**Objective:** Add rate limiting to protect the API.

### Planned Deliverables:
- [ ] Rate limiter middleware
- [ ] Per-user rate limits
- [ ] Sliding window algorithm
- [ ] Rate limit headers

---

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Run development server
npm run dev

# Run tests
npm test

# Run production server
npm start
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhook/github` | Receive GitHub webhook events |
| GET | `/feed/:username` | Get user activity feed |
| GET | `/health` | Health check |
| GET | `/` | API information |

---

## Architecture

```
GitHub Webhooks
     ↓
┌─────────────────────────────────────────┐
│          Express Application            │
├─────────────────────────────────────────┤
│  Middleware Layer                       │
│  ├─ Request Logger                      │
│  ├─ Signature Validation                │
│  └─ Input Validation                    │
├─────────────────────────────────────────┤
│  Routes Layer                           │
│  ├─ /webhook/github                     │
│  └─ /feed/:username                     │
├─────────────────────────────────────────┤
│  Services Layer                         │
│  └─ Event Normalizer                    │
├─────────────────────────────────────────┤
│  Storage Layer                          │
│  └─ Activity Store (In-Memory)          │
└─────────────────────────────────────────┘
     ↓
  Feed API
```
