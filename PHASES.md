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

## Phase 5: Persistent Storage ✅

**Status:** Complete

**Objective:** Replace in-memory store with MongoDB.

### Deliverables:
- [x] MongoDB connection setup with Mongoose
- [x] Activity model with schema validation
- [x] Database indexes on `username + timestamp`
- [x] Connection pooling configuration
- [x] Graceful shutdown handling

### Files Created:
- `src/config/database.js`
- `src/models/Activity.js`
- `tests/setup.js`

### Environment Variables:
```
MONGODB_URI=mongodb://localhost:27017/feedora
MONGODB_POOL_SIZE=10
```

---

## Phase 6: Caching Layer ✅

**Status:** Complete

**Objective:** Add Redis caching for hot feeds.

### Deliverables:
- [x] Redis connection setup with ioredis
- [x] Cache-aside pattern for feeds
- [x] Cache invalidation on new activities
- [x] TTL configuration
- [x] Graceful fallback when Redis unavailable

### Files Created:
- `src/config/redis.js`
- `src/services/cacheService.js`

### Environment Variables:
```
REDIS_URL=redis://localhost:6379
REDIS_TTL=300
```

---

## Phase 7: Real-time Updates ✅

**Status:** Complete

**Objective:** Add WebSocket support for live feeds.

### Deliverables:
- [x] WebSocket server setup with ws
- [x] Live feed subscriptions per user
- [x] Event broadcasting on new activities
- [x] Connection management with heartbeat
- [x] Client subscribe/unsubscribe messages

### Files Created:
- `src/services/websocketService.js`

### WebSocket API:
```
WS /ws

// Subscribe to a user's feed
{"type": "subscribe", "username": "octocat"}

// Unsubscribe from a user's feed
{"type": "unsubscribe", "username": "octocat"}

// Incoming activity broadcast
{"type": "activity", "activity": {...}}
```

---

## Phase 8: Rate Limiting & Throttling ✅

**Status:** Complete

**Objective:** Add rate limiting to protect the API.

### Deliverables:
- [x] Rate limiter middleware with sliding window
- [x] Redis-backed rate limiting (with memory fallback)
- [x] Per-endpoint rate limits
- [x] Rate limit headers (X-RateLimit-*)
- [x] Configurable limits via environment

### Files Created:
- `src/middleware/rateLimiter.js`

### Rate Limits:
| Endpoint | Limit |
|----------|-------|
| `/webhook/github` | 1000 requests/minute |
| `/feed/:username` | 60 requests/minute |
| API (general) | 100 requests/minute |

### Environment Variables:
```
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_API_MAX=100
RATE_LIMIT_WEBHOOK_MAX=1000
RATE_LIMIT_FEED_MAX=60
RATE_LIMITING=true
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Start MongoDB and Redis (Docker example)
docker run -d -p 27017:27017 mongo
docker run -d -p 6379:6379 redis

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
| WS | `/ws` | WebSocket real-time feed |

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
│  ├─ Rate Limiter                        │
│  ├─ Signature Validation                │
│  └─ Input Validation                    │
├─────────────────────────────────────────┤
│  Routes Layer                           │
│  ├─ /webhook/github                     │
│  └─ /feed/:username                     │
├─────────────────────────────────────────┤
│  Services Layer                         │
│  ├─ Event Normalizer                    │
│  ├─ Cache Service (Redis)               │
│  └─ WebSocket Service                   │
├─────────────────────────────────────────┤
│  Storage Layer                          │
│  └─ Activity Store (MongoDB)            │
└─────────────────────────────────────────┘
     ↓
  Feed API / WebSocket
```

---

## Project Structure

```
feedora/
├── src/
│   ├── app.js                 # Main application entry
│   ├── config/
│   │   ├── index.js           # Configuration
│   │   ├── database.js        # MongoDB connection
│   │   └── redis.js           # Redis connection
│   ├── middleware/
│   │   ├── errorHandler.js    # Error handling
│   │   ├── rateLimiter.js     # Rate limiting
│   │   ├── requestLogger.js   # Request logging
│   │   ├── validateInput.js   # Input validation
│   │   └── validateSignature.js # Webhook signature
│   ├── models/
│   │   └── Activity.js        # MongoDB Activity model
│   ├── routes/
│   │   ├── feed.routes.js     # Feed endpoints
│   │   └── webhook.routes.js  # Webhook endpoints
│   ├── services/
│   │   ├── cacheService.js    # Redis caching
│   │   ├── eventNormalizer.js # Event normalization
│   │   └── websocketService.js # WebSocket handling
│   ├── store/
│   │   └── activityStore.js   # Activity data access
│   └── utils/
│       ├── errors.js          # Custom error classes
│       └── logger.js          # Structured logging
├── tests/
│   ├── fixtures/
│   │   └── webhookPayloads.js # Test data
│   ├── integration/
│   │   ├── feed.test.js
│   │   └── webhook.test.js
│   ├── unit/
│   │   ├── activityStore.test.js
│   │   └── eventNormalizer.test.js
│   └── setup.js               # Test database setup
├── .env.example
├── package.json
└── PHASES.md
```
