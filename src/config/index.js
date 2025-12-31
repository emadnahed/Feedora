/**
 * Application Configuration
 * Loads environment variables and provides defaults
 */

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  github: {
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || ''
  },

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/feedora',
    options: {
      maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE, 10) || 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }
  },

  // Redis Configuration (Phase 6)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.REDIS_TTL, 10) || 300 // 5 minutes default
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000, // 1 minute
    api: {
      maxRequests: parseInt(process.env.RATE_LIMIT_API_MAX, 10) || 100
    },
    webhook: {
      maxRequests: parseInt(process.env.RATE_LIMIT_WEBHOOK_MAX, 10) || 1000
    },
    feed: {
      maxRequests: parseInt(process.env.RATE_LIMIT_FEED_MAX, 10) || 60
    }
  },

  // Feature flags
  features: {
    validateSignature: process.env.VALIDATE_SIGNATURE !== 'false',
    rateLimiting: process.env.RATE_LIMITING !== 'false'
  }
};

module.exports = config;
