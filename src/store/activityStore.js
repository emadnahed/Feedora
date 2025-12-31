/**
 * In-memory Activity Store
 * Stores normalized activities indexed by username for efficient feed retrieval
 */

const activities = new Map();

/**
 * Add an activity to the store
 * @param {Object} activity - Normalized activity object
 */
function addActivity(activity) {
  const { username } = activity;

  if (!activities.has(username)) {
    activities.set(username, []);
  }

  activities.get(username).push(activity);
}

/**
 * Get activities for a specific user with pagination and filtering
 * @param {string} username - GitHub username
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of activities to return (default: 20)
 * @param {string} options.cursor - Cursor for pagination (activity ID)
 * @param {string} options.type - Filter by activity type (PUSH, PR, ISSUE, STAR)
 * @param {string} options.repo - Filter by repository name
 * @param {string} options.sort - Sort order: 'desc' (newest first) or 'asc' (oldest first)
 * @param {string} options.startDate - Filter activities after this date (ISO string)
 * @param {string} options.endDate - Filter activities before this date (ISO string)
 * @returns {Object} - Object with activities array and pagination info
 */
function getActivitiesByUser(username, options = {}) {
  const {
    limit = 20,
    cursor = null,
    type = null,
    repo = null,
    sort = 'desc',
    startDate = null,
    endDate = null
  } = options;

  let userActivities = activities.get(username) || [];

  // Apply filters
  if (type) {
    userActivities = userActivities.filter(a => a.type === type.toUpperCase());
  }

  if (repo) {
    userActivities = userActivities.filter(a =>
      a.repo.toLowerCase().includes(repo.toLowerCase())
    );
  }

  // ISO 8601 strings can be compared lexicographically for date ordering
  if (startDate) {
    const startIso = new Date(startDate).toISOString();
    userActivities = userActivities.filter(a => a.timestamp >= startIso);
  }

  if (endDate) {
    const endIso = new Date(endDate).toISOString();
    userActivities = userActivities.filter(a => a.timestamp <= endIso);
  }

  // Sort activities using string comparison (ISO timestamps are lexicographically sortable)
  const sortedActivities = [...userActivities].sort((a, b) => {
    return sort === 'desc'
      ? b.timestamp.localeCompare(a.timestamp)
      : a.timestamp.localeCompare(b.timestamp);
  });

  // Get total count before pagination
  const total = sortedActivities.length;

  // Apply cursor-based pagination
  let startIndex = 0;
  if (cursor) {
    const cursorIndex = sortedActivities.findIndex(a => a.id === cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  // Get page of activities
  const pageActivities = sortedActivities.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < total;
  const nextCursor = hasMore ? pageActivities[pageActivities.length - 1]?.id : null;

  return {
    activities: pageActivities,
    pagination: {
      total,
      hasMore,
      nextCursor
    }
  };
}

/**
 * Get activity count for a user
 * @param {string} username - GitHub username
 * @returns {number} - Total number of activities
 */
function getActivityCount(username) {
  const userActivities = activities.get(username) || [];
  return userActivities.length;
}

/**
 * Get all activities (for debugging)
 * @returns {Map} - All activities
 */
function getAllActivities() {
  return activities;
}

/**
 * Clear all activities (for testing)
 */
function clearActivities() {
  activities.clear();
}

module.exports = {
  addActivity,
  getActivitiesByUser,
  getActivityCount,
  getAllActivities,
  clearActivities
};
