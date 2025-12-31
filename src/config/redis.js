/**
 * Redis Configuration
 * Handles Redis connection setup and management
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');
const config = require('./index');

let redisClient = null;
let isConnected = false;

/**
 * Create and connect to Redis
 * @param {string} url - Redis connection URL
 * @returns {Promise<Redis>}
 */
async function connect(url) {
  if (redisClient && isConnected) {
    logger.info('Redis already connected');
    return redisClient;
  }

  const connectionUrl = url || config.redis.url;

  try {
    redisClient = new Redis(connectionUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      showFriendlyErrorStack: config.nodeEnv === 'development'
    });

    // Connection event handlers
    redisClient.on('connect', () => {
      isConnected = true;
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });

    redisClient.on('close', () => {
      isConnected = false;
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis', { error: error.message });
    throw error;
  }
}

/**
 * Disconnect from Redis
 * @returns {Promise<void>}
 */
async function disconnect() {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    logger.info('Redis disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting from Redis', { error: error.message });
    throw error;
  }
}

/**
 * Get Redis client instance
 * @returns {Redis|null}
 */
function getClient() {
  return redisClient;
}

/**
 * Check if Redis is connected
 * @returns {boolean}
 */
function isRedisConnected() {
  return isConnected && redisClient && redisClient.status === 'ready';
}

module.exports = {
  connect,
  disconnect,
  getClient,
  isRedisConnected
};
