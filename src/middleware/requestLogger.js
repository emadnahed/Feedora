/**
 * Request Logger Middleware
 * Logs incoming requests and outgoing responses
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Generates a unique request ID and logs request/response
 */
function requestLogger(req, res, next) {
  // Generate unique request ID
  req.requestId = uuidv4();
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;

    logger.info('Outgoing response', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });

    return originalSend.call(this, body);
  };

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);

  next();
}

module.exports = requestLogger;
