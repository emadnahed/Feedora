/**
 * Webhook Routes
 * Handles incoming GitHub webhook events
 */

const express = require('express');
const router = express.Router();
const { normalizeEvent } = require('../services/eventNormalizer');
const { addActivity } = require('../store/activityStore');

/**
 * POST /webhook/github
 * Receives GitHub webhook events and stores normalized activities
 */
router.post('/github', (req, res) => {
  const eventType = req.headers['x-github-event'];
  const payload = req.body;

  if (!eventType) {
    return res.status(400).json({
      error: 'Missing X-GitHub-Event header'
    });
  }

  const activity = normalizeEvent(eventType, payload);

  if (!activity) {
    return res.status(200).json({
      message: `Event type '${eventType}' not supported, ignoring`
    });
  }

  addActivity(activity);

  res.status(201).json({
    message: 'Activity recorded',
    activity
  });
});

module.exports = router;
