/**
 * GitHub Webhook Signature Validation Middleware
 * Verifies the HMAC SHA-256 signature from GitHub webhooks
 */

const crypto = require('crypto');
const config = require('../config');

/**
 * Validates GitHub webhook signature
 * GitHub sends signature in X-Hub-Signature-256 header
 */
function validateSignature(req, res, next) {
  // Skip validation if disabled or no secret configured
  if (!config.features.validateSignature || !config.github.webhookSecret) {
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];

  if (!signature) {
    return res.status(401).json({
      error: 'Missing webhook signature'
    });
  }

  const payload = JSON.stringify(req.body);
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', config.github.webhookSecret)
    .update(payload)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    return res.status(401).json({
      error: 'Invalid webhook signature'
    });
  }

  next();
}

module.exports = validateSignature;
