/**
 * Feed Routes
 * Exposes activity feed API endpoints
 */

const express = require('express');
const router = express.Router();
const { getActivitiesByUser } = require('../store/activityStore');
const { validateFeedParams } = require('../middleware/validateInput');

/**
 * GET /feed/:username
 * Returns the activity feed for a given user
 */
router.get('/:username', validateFeedParams, (req, res) => {
  const { username } = req.params;
  const { limit } = req.query;

  const options = {};
  if (limit) {
    options.limit = parseInt(limit, 10);
  }

  const activities = getActivitiesByUser(username, options);

  res.json({
    username,
    count: activities.length,
    activities
  });
});

module.exports = router;
