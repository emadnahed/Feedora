/**
 * Input Validation Middleware
 * Validates and sanitizes incoming request data
 */

/**
 * Validates webhook payload structure
 */
function validateWebhookPayload(req, res, next) {
  const eventType = req.headers['x-github-event'];
  const payload = req.body;

  if (!eventType) {
    return res.status(400).json({
      error: 'Missing X-GitHub-Event header'
    });
  }

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({
      error: 'Invalid payload: expected JSON object'
    });
  }

  // Validate payload has expected structure based on event type
  const validators = {
    push: validatePushPayload,
    pull_request: validatePullRequestPayload,
    issues: validateIssuesPayload,
    watch: validateWatchPayload
  };

  const validator = validators[eventType];

  if (validator) {
    const validation = validator(payload);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error
      });
    }
  }

  next();
}

function validatePushPayload(payload) {
  if (!payload.repository) {
    return { valid: false, error: 'Missing repository in push payload' };
  }
  return { valid: true };
}

function validatePullRequestPayload(payload) {
  if (!payload.action) {
    return { valid: false, error: 'Missing action in pull_request payload' };
  }
  if (!payload.pull_request) {
    return { valid: false, error: 'Missing pull_request in payload' };
  }
  return { valid: true };
}

function validateIssuesPayload(payload) {
  if (!payload.action) {
    return { valid: false, error: 'Missing action in issues payload' };
  }
  if (!payload.issue) {
    return { valid: false, error: 'Missing issue in payload' };
  }
  return { valid: true };
}

function validateWatchPayload(payload) {
  if (!payload.action) {
    return { valid: false, error: 'Missing action in watch payload' };
  }
  return { valid: true };
}

/**
 * Validates feed query parameters
 */
function validateFeedParams(req, res, next) {
  const { limit, type, sort } = req.query;

  if (limit) {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        error: 'Invalid limit: must be between 1 and 100'
      });
    }
  }

  if (type) {
    const validTypes = ['PUSH', 'PR', 'ISSUE', 'STAR'];
    if (!validTypes.includes(type.toUpperCase())) {
      return res.status(400).json({
        error: `Invalid type: must be one of ${validTypes.join(', ')}`
      });
    }
  }

  if (sort) {
    const validSorts = ['asc', 'desc'];
    if (!validSorts.includes(sort.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid sort: must be asc or desc'
      });
    }
  }

  next();
}

module.exports = {
  validateWebhookPayload,
  validateFeedParams
};
