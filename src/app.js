/**
 * GitHub Activity Feed System
 * Main Express Application Entry Point
 */

const express = require('express');
const webhookRoutes = require('./routes/webhook.routes');
const feedRoutes = require('./routes/feed.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/webhook', webhookRoutes);
app.use('/feed', feedRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'GitHub Activity Feed System',
    version: '1.0.0',
    endpoints: {
      webhook: 'POST /webhook/github',
      feed: 'GET /feed/:username',
      health: 'GET /health'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`GitHub Activity Feed Server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log(`  POST /webhook/github  - Receive GitHub webhooks`);
  console.log(`  GET  /feed/:username  - Get user activity feed`);
  console.log(`  GET  /health          - Health check`);
});

module.exports = app;
