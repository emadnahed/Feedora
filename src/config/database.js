/**
 * MongoDB Database Configuration
 * Handles connection setup, pooling, and graceful shutdown
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const defaultOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
};

let isConnected = false;

/**
 * Connect to MongoDB
 * @param {string} uri - MongoDB connection URI
 * @param {Object} options - Mongoose connection options
 * @returns {Promise<mongoose.Connection>}
 */
async function connect(uri, options = {}) {
  if (isConnected) {
    logger.info('MongoDB already connected');
    return mongoose.connection;
  }

  const connectionUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/feedora';
  const connectionOptions = { ...defaultOptions, ...options };

  try {
    await mongoose.connect(connectionUri, connectionOptions);
    isConnected = true;

    logger.info('MongoDB connected successfully', {
      host: mongoose.connection.host,
      name: mongoose.connection.name
    });

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      logger.info('MongoDB reconnected');
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error: error.message });
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
async function disconnect() {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', { error: error.message });
    throw error;
  }
}

/**
 * Check if database is connected
 * @returns {boolean}
 */
function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Get the mongoose connection instance
 * @returns {mongoose.Connection}
 */
function getConnection() {
  return mongoose.connection;
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  await disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnect();
  process.exit(0);
});

module.exports = {
  connect,
  disconnect,
  isDbConnected,
  getConnection,
  mongoose
};
