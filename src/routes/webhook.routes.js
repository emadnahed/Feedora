/**
 * Webhook Routes
 * Handles incoming GitHub webhook events
 */

const express = require('express');
const router = express.Router();
const { normalizeEvent } = require('../services/eventNormalizer');
const { addActivity } = require('../store/activityStore');
const validateSignature = require('../middleware/validateSignature');
const { validateWebhookPayload } = require('../middleware/validateInput');

/**
 * POST /webhook/github
 * Receives GitHub webhook events and stores normalized activities
 *
 * Middleware:
 * 1. validateSignature - Verifies GitHub HMAC signature
 * 2. validateWebhookPayload - Validates payload structure
 */
router.post('/github', validateSignature, validateWebhookPayload, async (req, res, next) => {
  try {
    const eventType = req.headers['x-github-event'];
    const payload = req.body;

    const activity = normalizeEvent(eventType, payload);

    if (!activity) {
      return res.status(200).json({
        message: `Event type '${eventType}' not supported, ignoring`
      });
    }

    await addActivity(activity);

    res.status(201).json({
      message: 'Activity recorded',
      activity
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
