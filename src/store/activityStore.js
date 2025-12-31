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
 * Get activities for a specific user
 * @param {string} username - GitHub username
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of activities to return
 * @returns {Array} - Array of activities sorted by timestamp (newest first)
 */
function getActivitiesByUser(username, options = {}) {
  const { limit = 50 } = options;
  const userActivities = activities.get(username) || [];

  return userActivities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
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
  getAllActivities,
  clearActivities
};
