/**
 * Event Normalizer
 * Transforms GitHub webhook payloads into normalized activity format
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Normalize a GitHub webhook event into a feed-friendly activity
 * @param {string} eventType - GitHub event type from X-GitHub-Event header
 * @param {Object} payload - GitHub webhook payload
 * @returns {Object|null} - Normalized activity or null if event type not supported
 */
function normalizeEvent(eventType, payload) {
  const normalizers = {
    push: normalizePushEvent,
    pull_request: normalizePullRequestEvent,
    issues: normalizeIssueEvent,
    watch: normalizeStarEvent
  };

  const normalizer = normalizers[eventType];

  if (!normalizer) {
    return null;
  }

  return normalizer(payload);
}

/**
 * Normalize push event
 */
function normalizePushEvent(payload) {
  const { pusher, repository, commits = [] } = payload;
  const commitCount = commits.length;

  return {
    id: uuidv4(),
    username: pusher?.name || 'unknown',
    type: 'PUSH',
    repo: repository?.full_name || 'unknown/unknown',
    message: `Pushed ${commitCount} commit${commitCount !== 1 ? 's' : ''}`,
    timestamp: new Date().toISOString()
  };
}

/**
 * Normalize pull request event
 */
function normalizePullRequestEvent(payload) {
  const { action, pull_request, repository, sender } = payload;

  const actionMessages = {
    opened: 'Opened pull request',
    closed: pull_request?.merged ? 'Merged pull request' : 'Closed pull request',
    reopened: 'Reopened pull request',
    edited: 'Edited pull request'
  };

  const message = actionMessages[action] || `${action} pull request`;

  return {
    id: uuidv4(),
    username: sender?.login || 'unknown',
    type: 'PR',
    repo: repository?.full_name || 'unknown/unknown',
    message: `${message}: #${pull_request?.number} ${pull_request?.title || ''}`.trim(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Normalize issue event
 */
function normalizeIssueEvent(payload) {
  const { action, issue, repository, sender } = payload;

  const actionMessages = {
    opened: 'Opened issue',
    closed: 'Closed issue',
    reopened: 'Reopened issue',
    edited: 'Edited issue'
  };

  const message = actionMessages[action] || `${action} issue`;

  return {
    id: uuidv4(),
    username: sender?.login || 'unknown',
    type: 'ISSUE',
    repo: repository?.full_name || 'unknown/unknown',
    message: `${message}: #${issue?.number} ${issue?.title || ''}`.trim(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Normalize star (watch) event
 */
function normalizeStarEvent(payload) {
  const { action, repository, sender } = payload;

  return {
    id: uuidv4(),
    username: sender?.login || 'unknown',
    type: 'STAR',
    repo: repository?.full_name || 'unknown/unknown',
    message: action === 'started' ? 'Starred repository' : 'Unstarred repository',
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  normalizeEvent
};
