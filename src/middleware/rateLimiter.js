/**
 * Rate Limiter Middleware
 * Implements sliding window rate limiting with Redis (or in-memory fallback)
 */

const { getClient, isRedisConnected } = require('../config/redis');
const logger = require('../utils/logger');
const { RateLimitError } = require('../utils/errors');

// In-memory store for fallback when Redis is unavailable
const memoryStore = new Map();

// Default configuration
const DEFAULT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,    // 100 requests per window
  keyPrefix: 'ratelimit:'
};

/**
 * Get client identifier from request
 * @param {Object} req - Express request
 * @returns {string} - Client identifier
 */
function getClientId(req) {
  // Use user-provided API key, or fallback to IP
  return req.headers['x-api-key'] ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.ip ||
         'unknown';
}

/**
 * Get rate limit status from Redis using sliding window
 * @param {string} key - Rate limit key
 * @param {number} windowMs - Window size in milliseconds
 * @param {number} maxRequests - Maximum requests per window
 * @returns {Promise<Object>} - Rate limit status
 */
async function getRateLimitFromRedis(key, windowMs, maxRequests) {
  const client = getClient();
  const now = Date.now();
  const windowStart = now - windowMs;

  const multi = client.multi();

  // Remove old entries
  multi.zremrangebyscore(key, 0, windowStart);

  // Add current request
  multi.zadd(key, now, `${now}-${Math.random()}`);

  // Count requests in window
  multi.zcard(key);

  // Set expiry
  multi.pexpire(key, windowMs);

  const results = await multi.exec();
  const count = results[2][1];

  return {
    count,
    remaining: Math.max(0, maxRequests - count),
    reset: Math.ceil((windowStart + windowMs) / 1000),
    limited: count > maxRequests
  };
}

/**
 * Get rate limit status from memory (fallback)
 * @param {string} key - Rate limit key
 * @param {number} windowMs - Window size in milliseconds
 * @param {number} maxRequests - Maximum requests per window
 * @returns {Object} - Rate limit status
 */
function getRateLimitFromMemory(key, windowMs, maxRequests) {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get or create entry
  if (!memoryStore.has(key)) {
    memoryStore.set(key, []);
  }

  const requests = memoryStore.get(key);

  // Remove old entries
  const validRequests = requests.filter(ts => ts > windowStart);

  // Add current request
  validRequests.push(now);
  memoryStore.set(key, validRequests);

  const count = validRequests.length;

  return {
    count,
    remaining: Math.max(0, maxRequests - count),
    reset: Math.ceil((windowStart + windowMs) / 1000),
    limited: count > maxRequests
  };
}

/**
 * Clean up old entries from memory store periodically
 */
function cleanupMemoryStore() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  for (const [key, requests] of memoryStore.entries()) {
    const validRequests = requests.filter(ts => ts > oneMinuteAgo);
    if (validRequests.length === 0) {
      memoryStore.delete(key);
    } else {
      memoryStore.set(key, validRequests);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupMemoryStore, 60000);

/**
 * Create rate limiter middleware
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Window size in milliseconds
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {string} options.keyPrefix - Redis key prefix
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {boolean} options.skip - Skip rate limiting (for testing)
 * @returns {Function} - Express middleware
 */
function createRateLimiter(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  return async (req, res, next) => {
    // Skip if disabled
    if (config.skip) {
      return next();
    }

    const clientId = config.keyGenerator ? config.keyGenerator(req) : getClientId(req);
    const key = `${config.keyPrefix}${clientId}`;

    try {
      let status;

      if (isRedisConnected()) {
        status = await getRateLimitFromRedis(key, config.windowMs, config.maxRequests);
      } else {
        status = getRateLimitFromMemory(key, config.windowMs, config.maxRequests);
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', status.remaining);
      res.setHeader('X-RateLimit-Reset', status.reset);

      if (status.limited) {
        const retryAfter = Math.ceil((status.reset * 1000 - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter);

        logger.warn('Rate limit exceeded', { clientId, count: status.count });

        throw new RateLimitError('Too many requests, please try again later');
      }

      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        next(error);
      } else {
        // Log error but don't block request if rate limiting fails
        logger.error('Rate limiter error', { error: error.message });
        next();
      }
    }
  };
}

/**
 * Pre-configured rate limiters for different endpoints
 */
const rateLimiters = {
  // General API rate limit: 100 requests per minute
  api: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'ratelimit:api:'
  }),

  // Webhook rate limit: 1000 requests per minute (higher for automation)
  webhook: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 1000,
    keyPrefix: 'ratelimit:webhook:'
  }),

  // Feed rate limit: 60 requests per minute per user
  feed: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
    keyPrefix: 'ratelimit:feed:'
  }),

  // Strict rate limit: 10 requests per minute (for sensitive endpoints)
  strict: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'ratelimit:strict:'
  })
};

module.exports = {
  createRateLimiter,
  rateLimiters,
  getClientId
};
