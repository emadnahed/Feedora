# GitHub Activity Feed System (Express.js)

A **production-style MVP backend** that ingests **GitHub webhook events**, normalizes them, and exposes a **user activity feed API** similar to GitHub’s activity timeline.

This project is intentionally minimal but architected using **real-world backend principles** such as event-driven ingestion, data normalization, and feed-based querying.

---

## 🚀 Why This Project Matters

Modern platforms (GitHub, Twitter, LinkedIn, Stripe dashboards) rely on **activity feeds** to:

- Track user actions over time
- Build timelines and dashboards
- Power notifications and analytics
- Enable fan-out and personalization

This project demonstrates how such a system is **designed at a backend level**, not just implemented.

---

## 🧠 What This Service Does

1. Receives GitHub webhook events (Push, PR, Issues, Stars)
2. Normalizes complex webhook payloads into a simple feed format
3. Stores activities (in-memory for MVP)
4. Exposes an API to fetch a user’s activity feed

---

## 🏗️ High-Level Architecture

GitHub Webhooks  
→ Express Webhook Receiver  
→ Event Normalizer  
→ Activity Store  
→ Feed API  

This mirrors how real event-driven systems work in production.

---

## 📦 Tech Stack

- **Node.js**
- **Express.js**
- **GitHub Webhooks**
- **In-memory store** (upgradeable to MongoDB/PostgreSQL)
- **REST API design**

---

## 📁 Project Structure

```
github-activity-feed/
├── src/
│   ├── app.js                # App entry point
│   ├── routes/
│   │   ├── webhook.routes.js # GitHub webhook receiver
│   │   └── feed.routes.js    # Activity feed API
│   ├── services/
│   │   └── eventNormalizer.js# Normalizes GitHub events
│   └── store/
│       └── activityStore.js  # Activity storage (MVP)
├── package.json
└── README.md
```

---

## 🧾 Normalized Activity Model

All GitHub events are converted into a **single, feed-friendly structure**:

```json
{
  "id": "uuid",
  "username": "octocat",
  "type": "PUSH | PR | ISSUE | STAR",
  "repo": "octocat/hello-world",
  "message": "Pushed 3 commits",
  "timestamp": "2025-01-01T10:00:00Z"
}
```

This design enables:
- Easy sorting by time
- Pagination
- Caching
- Feed fan-out in the future

---

## 🔌 API Endpoints

### 1️⃣ GitHub Webhook Receiver

**POST** `/webhook/github`

Receives GitHub webhook events.

> In production, this endpoint should validate the GitHub signature for security.

---

### 2️⃣ Fetch User Activity Feed

**GET** `/feed/:username`

Returns the activity feed for a given user.

**Example Response**
```json
[
  {
    "type": "PUSH",
    "repo": "octocat/hello-world",
    "message": "Pushed 2 commits",
    "timestamp": "2025-01-01T10:00:00Z"
  }
]
```

---

## ⚙️ Running the Project Locally

### 1️⃣ Install dependencies
```bash
npm install
```

### 2️⃣ Start the server
```bash
node src/app.js
```

Server runs on:
```
http://localhost:3000
```

---

## 🧪 Testing with GitHub Webhooks

You can test locally using:
- GitHub repository webhooks
- ngrok / cloudflared
- Sample webhook payloads via Postman

---

## 🔒 Production Considerations (Not in MVP)

This MVP intentionally keeps things simple. In real production systems, you would add:

- GitHub webhook signature verification
- Persistent storage (MongoDB / PostgreSQL)
- Indexes on `username + timestamp`
- Pagination & cursors
- Redis caching for hot feeds
- Rate limiting
- Fan-out feeds (followers)
- Background processing (queues)
- Observability & logging

---

## 🧠 What This Demonstrates to Interviewers

- Event-driven backend design
- Clean separation of concerns
- Feed-oriented data modeling
- Scalability-aware architecture
- Practical Express.js usage beyond CRUD

This is **not a toy project** — it reflects how real backend systems start.

---

## 📌 Future Enhancements

- MongoDB-backed activity store
- Cursor-based pagination
- WebSocket / SSE live feeds
- Multi-repo aggregation
- User follow graph
- Notification service

---

## 🧑‍💻 Author

Built as a **backend system design showcase** using Express.js.

---

## 📄 License

MIT License
