/**
 * Structured Logger
 * Provides consistent logging with levels and JSON formatting
 */

const config = require('../config');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = config.nodeEnv === 'production' ? 'info' : 'debug';

/**
 * Format log entry as JSON
 */
function formatLog(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  });
}

/**
 * Check if log level should be output
 */
function shouldLog(level) {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

const logger = {
  error(message, meta = {}) {
    if (shouldLog('error')) {
      console.error(formatLog('error', message, meta));
    }
  },

  warn(message, meta = {}) {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, meta));
    }
  },

  info(message, meta = {}) {
    if (shouldLog('info')) {
      console.log(formatLog('info', message, meta));
    }
  },

  debug(message, meta = {}) {
    if (shouldLog('debug')) {
      console.log(formatLog('debug', message, meta));
    }
  }
};

module.exports = logger;
