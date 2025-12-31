/**
 * Feed Routes
 * Exposes activity feed API endpoints with pagination and filtering
 */

const express = require('express');
const router = express.Router();
const { getActivitiesByUser } = require('../store/activityStore');
const { validateFeedParams } = require('../middleware/validateInput');

/**
 * GET /feed/:username
 * Returns the activity feed for a given user
 *
 * Query Parameters:
 * - limit: Number of activities to return (1-100, default: 20)
 * - cursor: Cursor for pagination (activity ID from previous response)
 * - type: Filter by activity type (PUSH, PR, ISSUE, STAR)
 * - repo: Filter by repository name (partial match)
 * - sort: Sort order - 'desc' (newest first, default) or 'asc' (oldest first)
 * - startDate: Filter activities after this date (ISO string)
 * - endDate: Filter activities before this date (ISO string)
 */
router.get('/:username', validateFeedParams, async (req, res, next) => {
  try {
    const { username } = req.params;
    const { limit, cursor, type, repo, sort, startDate, endDate } = req.query;

    const options = {};

    if (limit) {
      options.limit = parseInt(limit, 10);
    }
    if (cursor) {
      options.cursor = cursor;
    }
    if (type) {
      options.type = type;
    }
    if (repo) {
      options.repo = repo;
    }
    if (sort) {
      options.sort = sort.toLowerCase();
    }
    if (startDate) {
      options.startDate = startDate;
    }
    if (endDate) {
      options.endDate = endDate;
    }

    const result = await getActivitiesByUser(username, options);

    res.json({
      username,
      count: result.activities.length,
      activities: result.activities,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
