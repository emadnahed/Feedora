/**
 * Input Validation Middleware
 * Validates and sanitizes incoming request data
 */

// Validators object defined once at module level for performance
const webhookValidators = {
  push: validatePushPayload,
  pull_request: validatePullRequestPayload,
  issues: validateIssuesPayload,
  watch: validateWatchPayload
};

// Valid activity types
const VALID_TYPES = ['PUSH', 'PR', 'ISSUE', 'STAR'];

// Valid sort orders
const VALID_SORTS = ['asc', 'desc'];

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

  const validator = webhookValidators[eventType];

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
 * Validates ISO 8601 date string format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - True if valid ISO date
 */
function isValidISODate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString().split('.')[0] + 'Z'
    || !isNaN(date.getTime());
}

/**
 * Validates feed query parameters
 */
function validateFeedParams(req, res, next) {
  const { limit, type, sort, startDate, endDate } = req.query;

  if (limit) {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        error: 'Invalid limit: must be between 1 and 100'
      });
    }
  }

  if (type) {
    if (!VALID_TYPES.includes(type.toUpperCase())) {
      return res.status(400).json({
        error: `Invalid type: must be one of ${VALID_TYPES.join(', ')}`
      });
    }
  }

  if (sort) {
    if (!VALID_SORTS.includes(sort.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid sort: must be asc or desc'
      });
    }
  }

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({
        error: 'Invalid startDate: must be a valid ISO 8601 date string'
      });
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'Invalid endDate: must be a valid ISO 8601 date string'
      });
    }
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return res.status(400).json({
        error: 'Invalid date range: startDate must be before endDate'
      });
    }
  }

  next();
}

module.exports = {
  validateWebhookPayload,
  validateFeedParams
};
