/**
 * Activity Store
 * MongoDB-backed storage for normalized activities
 * Provides efficient feed retrieval with pagination, filtering, and caching
 */

const Activity = require('../models/Activity');
const logger = require('../utils/logger');
const { getCachedFeed, setCachedFeed, invalidateUserCache, clearCache } = require('../services/cacheService');

/**
 * Add an activity to the store
 * @param {Object} activity - Normalized activity object
 * @returns {Promise<Object>} - Saved activity
 */
async function addActivity(activity) {
  try {
    const activityDoc = new Activity({
      ...activity,
      timestamp: new Date(activity.timestamp)
    });
    const saved = await activityDoc.save();
    logger.debug('Activity saved', { id: saved.id, username: saved.username });

    // Invalidate cache for this user since their feed has changed
    await invalidateUserCache(saved.username);

    return saved.toJSON();
  } catch (error) {
    // Handle duplicate key error gracefully
    if (error.code === 11000) {
      logger.warn('Duplicate activity ignored', { id: activity.id });
      return activity;
    }
    logger.error('Failed to save activity', { error: error.message });
    throw error;
  }
}

/**
 * Get activities for a specific user with pagination and filtering
 * Uses cache-aside pattern: check cache first, then database
 * @param {string} username - GitHub username
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of activities to return (default: 20)
 * @param {string} options.cursor - Cursor for pagination (activity ID)
 * @param {string} options.type - Filter by activity type (PUSH, PR, ISSUE, STAR)
 * @param {string} options.repo - Filter by repository name
 * @param {string} options.sort - Sort order: 'desc' (newest first) or 'asc' (oldest first)
 * @param {string} options.startDate - Filter activities after this date (ISO string)
 * @param {string} options.endDate - Filter activities before this date (ISO string)
 * @returns {Promise<Object>} - Object with activities array and pagination info
 */
async function getActivitiesByUser(username, options = {}) {
  const {
    limit = 20,
    cursor = null,
    type = null,
    repo = null,
    sort = 'desc',
    startDate = null,
    endDate = null
  } = options;

  // Try to get from cache first
  const cacheOptions = { limit, cursor: cursor || '', type: type || '', repo: repo || '', sort, startDate: startDate || '', endDate: endDate || '' };
  const cached = await getCachedFeed(username, cacheOptions);
  if (cached) {
    return cached;
  }

  // Build query
  const query = { username };

  if (type) {
    query.type = type.toUpperCase();
  }

  if (repo) {
    query.repo = { $regex: repo, $options: 'i' };
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) {
      query.timestamp.$gte = new Date(startDate);
    }
    if (endDate) {
      query.timestamp.$lte = new Date(endDate);
    }
  }

  // Get total count for pagination
  const total = await Activity.countDocuments(query);

  // Apply cursor-based pagination
  if (cursor) {
    const cursorActivity = await Activity.findOne({ id: cursor });
    if (cursorActivity) {
      const cursorTimestamp = cursorActivity.timestamp;
      if (sort === 'desc') {
        query.timestamp = { ...query.timestamp, $lt: cursorTimestamp };
      } else {
        query.timestamp = { ...query.timestamp, $gt: cursorTimestamp };
      }
    }
  }

  // Execute query with sorting and limit
  const sortOrder = sort === 'desc' ? -1 : 1;
  const activities = await Activity.find(query)
    .sort({ timestamp: sortOrder })
    .limit(limit + 1) // Fetch one extra to determine hasMore
    .lean();

  // Transform results to match expected format
  const hasMore = activities.length > limit;
  const pageActivities = hasMore ? activities.slice(0, limit) : activities;
  const nextCursor = hasMore && pageActivities.length > 0
    ? pageActivities[pageActivities.length - 1].id
    : null;

  // Transform activities to JSON format
  const transformedActivities = pageActivities.map(a => ({
    id: a.id,
    type: a.type,
    username: a.username,
    repo: a.repo,
    message: a.message,
    timestamp: a.timestamp.toISOString(),
    metadata: a.metadata
  }));

  const result = {
    activities: transformedActivities,
    pagination: {
      total,
      hasMore,
      nextCursor
    }
  };

  // Cache the result
  await setCachedFeed(username, cacheOptions, result);

  return result;
}

/**
 * Get activity count for a user
 * @param {string} username - GitHub username
 * @returns {Promise<number>} - Total number of activities
 */
async function getActivityCount(username) {
  return Activity.countDocuments({ username });
}

/**
 * Get all activities (for debugging)
 * @returns {Promise<Array>} - All activities
 */
async function getAllActivities() {
  return Activity.find().lean();
}

/**
 * Clear all activities (for testing)
 * @returns {Promise<void>}
 */
async function clearActivities() {
  await Activity.deleteMany({});
  await clearCache();
  logger.debug('All activities cleared');
}

/**
 * Broadcast a new activity (placeholder for Phase 7 WebSocket integration)
 * @param {Object} activity - Activity to broadcast
 */
function broadcastActivity(activity) {
  // This will be implemented in Phase 7 for real-time updates
  // For now, it's a no-op placeholder
}

module.exports = {
  addActivity,
  getActivitiesByUser,
  getActivityCount,
  getAllActivities,
  clearActivities,
  broadcastActivity
};
