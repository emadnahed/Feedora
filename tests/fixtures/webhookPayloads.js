/**
 * Test Fixtures - GitHub Webhook Payloads
 * Sample payloads for testing webhook handling
 */

const pushPayload = {
  pusher: {
    name: 'testuser'
  },
  repository: {
    full_name: 'testuser/test-repo'
  },
  commits: [
    { id: 'abc123', message: 'First commit' },
    { id: 'def456', message: 'Second commit' }
  ]
};

const pullRequestPayload = {
  action: 'opened',
  pull_request: {
    number: 42,
    title: 'Add new feature',
    merged: false
  },
  repository: {
    full_name: 'testuser/test-repo'
  },
  sender: {
    login: 'testuser'
  }
};

const pullRequestMergedPayload = {
  action: 'closed',
  pull_request: {
    number: 42,
    title: 'Add new feature',
    merged: true
  },
  repository: {
    full_name: 'testuser/test-repo'
  },
  sender: {
    login: 'testuser'
  }
};

const issuePayload = {
  action: 'opened',
  issue: {
    number: 10,
    title: 'Bug report'
  },
  repository: {
    full_name: 'testuser/test-repo'
  },
  sender: {
    login: 'testuser'
  }
};

const watchPayload = {
  action: 'started',
  repository: {
    full_name: 'testuser/test-repo'
  },
  sender: {
    login: 'testuser'
  }
};

const invalidPayload = {
  random: 'data'
};

module.exports = {
  pushPayload,
  pullRequestPayload,
  pullRequestMergedPayload,
  issuePayload,
  watchPayload,
  invalidPayload
};
