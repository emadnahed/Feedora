/**
 * GitHub Activity Feed System
 * Main Express Application Entry Point
 */

const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');

// Routes
const webhookRoutes = require('./routes/webhook.routes');
const feedRoutes = require('./routes/feed.routes');

// Middleware
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Trust proxy (for correct IP logging behind reverse proxy)
app.set('trust proxy', 1);

// Body parsing middleware with raw body capture for webhook signature verification
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Request logging middleware
app.use(requestLogger);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  // Content-Security-Policy replaces deprecated X-XSS-Protection
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'");
  next();
});

// Routes
app.use('/webhook', webhookRoutes);
app.use('/feed', feedRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
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
    },
    documentation: {
      feedParams: {
        limit: 'Number of activities (1-100, default: 20)',
        cursor: 'Pagination cursor (activity ID)',
        type: 'Filter by type (PUSH, PR, ISSUE, STAR)',
        repo: 'Filter by repository name',
        sort: 'Sort order (desc or asc)',
        startDate: 'Filter by start date (ISO string)',
        endDate: 'Filter by end date (ISO string)'
      }
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(config.port, () => {
    logger.info('Server started', {
      port: config.port,
      environment: config.nodeEnv
    });
    console.log(`\nGitHub Activity Feed Server running on http://localhost:${config.port}`);
    console.log('\nEndpoints:');
    console.log(`  POST /webhook/github  - Receive GitHub webhooks`);
    console.log(`  GET  /feed/:username  - Get user activity feed`);
    console.log(`  GET  /health          - Health check`);
    console.log(`\nEnvironment: ${config.nodeEnv}`);
  });
}

module.exports = app;
