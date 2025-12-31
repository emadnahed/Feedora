/**
 * Cache Service
 * Implements cache-aside pattern for feed data with Redis
 */

const logger = require('../utils/logger');
const config = require('../config');
const { getClient, isRedisConnected } = require('../config/redis');

const CACHE_PREFIX = 'feedora:feed:';
const DEFAULT_TTL = config.redis.ttl || 300; // 5 minutes

/**
 * Generate cache key for a feed query
 * @param {string} username - Username
 * @param {Object} options - Query options
 * @returns {string} - Cache key
 */
function generateCacheKey(username, options = {}) {
  const { limit = 20, cursor = '', type = '', repo = '', sort = 'desc', startDate = '', endDate = '' } = options;
  const keyParts = [
    CACHE_PREFIX,
    username,
    `l:${limit}`,
    `c:${cursor}`,
    `t:${type}`,
    `r:${repo}`,
    `s:${sort}`,
    `sd:${startDate}`,
    `ed:${endDate}`
  ];
  return keyParts.join(':');
}

/**
 * Get cached feed data
 * @param {string} username - Username
 * @param {Object} options - Query options
 * @returns {Promise<Object|null>} - Cached data or null
 */
async function getCachedFeed(username, options = {}) {
  if (!isRedisConnected()) {
    return null;
  }

  const client = getClient();
  const cacheKey = generateCacheKey(username, options);

  try {
    const cached = await client.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit', { key: cacheKey });
      return JSON.parse(cached);
    }
    logger.debug('Cache miss', { key: cacheKey });
    return null;
  } catch (error) {
    logger.error('Cache read error', { error: error.message, key: cacheKey });
    return null;
  }
}

/**
 * Set cached feed data
 * @param {string} username - Username
 * @param {Object} options - Query options
 * @param {Object} data - Data to cache
 * @param {number} ttl - TTL in seconds (optional)
 * @returns {Promise<void>}
 */
async function setCachedFeed(username, options = {}, data, ttl = DEFAULT_TTL) {
  if (!isRedisConnected()) {
    return;
  }

  const client = getClient();
  const cacheKey = generateCacheKey(username, options);

  try {
    await client.setex(cacheKey, ttl, JSON.stringify(data));
    logger.debug('Cache set', { key: cacheKey, ttl });
  } catch (error) {
    logger.error('Cache write error', { error: error.message, key: cacheKey });
  }
}

/**
 * Invalidate all cached feeds for a user
 * @param {string} username - Username
 * @returns {Promise<number>} - Number of keys invalidated
 */
async function invalidateUserCache(username) {
  if (!isRedisConnected()) {
    return 0;
  }

  const client = getClient();
  const pattern = `${CACHE_PREFIX}${username}:*`;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
      logger.debug('Cache invalidated', { username, keysRemoved: keys.length });
    }
    return keys.length;
  } catch (error) {
    logger.error('Cache invalidation error', { error: error.message, username });
    return 0;
  }
}

/**
 * Clear all cache (for testing)
 * @returns {Promise<void>}
 */
async function clearCache() {
  if (!isRedisConnected()) {
    return;
  }

  const client = getClient();
  const pattern = `${CACHE_PREFIX}*`;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
    logger.debug('All cache cleared', { keysRemoved: keys.length });
  } catch (error) {
    logger.error('Cache clear error', { error: error.message });
  }
}

module.exports = {
  getCachedFeed,
  setCachedFeed,
  invalidateUserCache,
  clearCache,
  generateCacheKey
};
