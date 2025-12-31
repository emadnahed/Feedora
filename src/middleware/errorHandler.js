/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * Global error handler
 * Catches all errors and returns consistent error responses
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Error occurred', {
    requestId: req.requestId,
    error: err.message,
    code: err.code,
    stack: config.nodeEnv === 'development' ? err.stack : undefined
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Build error response
  const errorResponse = {
    error: {
      message: err.isOperational ? err.message : 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      requestId: req.requestId
    }
  };

  // Include details for validation errors
  if (err.details) {
    errorResponse.error.details = err.details;
  }

  // Include stack trace in development
  if (config.nodeEnv === 'development') {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      code: 'NOT_FOUND',
      requestId: req.requestId
    }
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
