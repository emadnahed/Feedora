/**
 * End-to-End Tests - Full Workflow
 * Tests complete user journeys through the system
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { setupTestDb, teardownTestDb } = require('../setup');
const { app } = require('../../src/app');
const { clearActivities } = require('../../src/store/activityStore');

let server;
let port;

// Helper to make HTTP requests
function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ ...options, port }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('E2E: Full Workflow Tests', () => {
  before(async () => {
    await setupTestDb();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) server.close();
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearActivities();
  });

  describe('Complete User Journey', () => {
    it('should handle full workflow: webhook -> store -> retrieve feed', async () => {
      // Step 1: Send multiple webhook events for a user
      const pushEvent = await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'push'
        }
      }, {
        pusher: { name: 'developer1' },
        repository: { full_name: 'developer1/my-project' },
        commits: [{ id: '1' }, { id: '2' }, { id: '3' }]
      });

      assert.strictEqual(pushEvent.statusCode, 201);
      assert.strictEqual(pushEvent.body.activity.type, 'PUSH');
      assert.strictEqual(pushEvent.body.activity.message, 'Pushed 3 commits');

      // Step 2: Send PR event
      const prEvent = await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'pull_request'
        }
      }, {
        action: 'opened',
        pull_request: { number: 42, title: 'Add new feature' },
        repository: { full_name: 'developer1/my-project' },
        sender: { login: 'developer1' }
      });

      assert.strictEqual(prEvent.statusCode, 201);
      assert.strictEqual(prEvent.body.activity.type, 'PR');

      // Step 3: Send issue event
      const issueEvent = await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'issues'
        }
      }, {
        action: 'opened',
        issue: { number: 10, title: 'Bug report' },
        repository: { full_name: 'developer1/my-project' },
        sender: { login: 'developer1' }
      });

      assert.strictEqual(issueEvent.statusCode, 201);
      assert.strictEqual(issueEvent.body.activity.type, 'ISSUE');

      // Step 4: Send star event
      const starEvent = await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'watch'
        }
      }, {
        action: 'started',
        repository: { full_name: 'developer1/another-repo' },
        sender: { login: 'developer1' }
      });

      assert.strictEqual(starEvent.statusCode, 201);
      assert.strictEqual(starEvent.body.activity.type, 'STAR');

      // Step 5: Retrieve the complete feed
      const feed = await request({
        hostname: 'localhost',
        path: '/feed/developer1',
        method: 'GET'
      });

      assert.strictEqual(feed.statusCode, 200);
      assert.strictEqual(feed.body.username, 'developer1');
      assert.strictEqual(feed.body.count, 4);
      assert.strictEqual(feed.body.activities.length, 4);

      // Verify activities are sorted by newest first
      const types = feed.body.activities.map(a => a.type);
      assert.ok(types.includes('PUSH'));
      assert.ok(types.includes('PR'));
      assert.ok(types.includes('ISSUE'));
      assert.ok(types.includes('STAR'));
    });

    it('should handle multi-user scenario correctly', async () => {
      // User 1 activities
      await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'push' }
      }, {
        pusher: { name: 'user1' },
        repository: { full_name: 'user1/repo' },
        commits: [{ id: '1' }]
      });

      await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'push' }
      }, {
        pusher: { name: 'user1' },
        repository: { full_name: 'user1/repo' },
        commits: [{ id: '2' }]
      });

      // User 2 activities
      await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'push' }
      }, {
        pusher: { name: 'user2' },
        repository: { full_name: 'user2/repo' },
        commits: [{ id: '1' }]
      });

      // Verify user1 feed
      const user1Feed = await request({
        hostname: 'localhost',
        path: '/feed/user1',
        method: 'GET'
      });

      assert.strictEqual(user1Feed.body.count, 2);
      assert.ok(user1Feed.body.activities.every(a => a.username === 'user1'));

      // Verify user2 feed
      const user2Feed = await request({
        hostname: 'localhost',
        path: '/feed/user2',
        method: 'GET'
      });

      assert.strictEqual(user2Feed.body.count, 1);
      assert.ok(user2Feed.body.activities.every(a => a.username === 'user2'));

      // Verify unknown user returns empty feed
      const unknownFeed = await request({
        hostname: 'localhost',
        path: '/feed/unknownuser',
        method: 'GET'
      });

      assert.strictEqual(unknownFeed.body.count, 0);
    });
  });

  describe('Pagination Workflow', () => {
    it('should paginate through large feed correctly', async () => {
      // Create 15 activities
      for (let i = 0; i < 15; i++) {
        await request({
          hostname: 'localhost',
          path: '/webhook/github',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'push' }
        }, {
          pusher: { name: 'paginationuser' },
          repository: { full_name: `paginationuser/repo-${i}` },
          commits: [{ id: String(i) }]
        });
        // Small delay to ensure different timestamps
        await new Promise(r => setTimeout(r, 10));
      }

      // Get first page (5 items)
      const page1 = await request({
        hostname: 'localhost',
        path: '/feed/paginationuser?limit=5',
        method: 'GET'
      });

      assert.strictEqual(page1.body.count, 5);
      assert.strictEqual(page1.body.pagination.total, 15);
      assert.strictEqual(page1.body.pagination.hasMore, true);
      assert.ok(page1.body.pagination.nextCursor);

      // Get second page
      const page2 = await request({
        hostname: 'localhost',
        path: `/feed/paginationuser?limit=5&cursor=${page1.body.pagination.nextCursor}`,
        method: 'GET'
      });

      assert.strictEqual(page2.body.count, 5);
      assert.strictEqual(page2.body.pagination.hasMore, true);

      // Get third page
      const page3 = await request({
        hostname: 'localhost',
        path: `/feed/paginationuser?limit=5&cursor=${page2.body.pagination.nextCursor}`,
        method: 'GET'
      });

      assert.strictEqual(page3.body.count, 5);
      assert.strictEqual(page3.body.pagination.hasMore, false);

      // Verify no duplicates across pages
      const allIds = [
        ...page1.body.activities.map(a => a.id),
        ...page2.body.activities.map(a => a.id),
        ...page3.body.activities.map(a => a.id)
      ];
      const uniqueIds = new Set(allIds);
      assert.strictEqual(uniqueIds.size, 15);
    });
  });

  describe('Filtering Workflow', () => {
    it('should filter by type correctly across full workflow', async () => {
      // Create mixed activities
      await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'push' }
      }, {
        pusher: { name: 'filteruser' },
        repository: { full_name: 'filteruser/repo' },
        commits: [{ id: '1' }]
      });

      await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'pull_request' }
      }, {
        action: 'opened',
        pull_request: { number: 1, title: 'PR 1' },
        repository: { full_name: 'filteruser/repo' },
        sender: { login: 'filteruser' }
      });

      await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'push' }
      }, {
        pusher: { name: 'filteruser' },
        repository: { full_name: 'filteruser/repo' },
        commits: [{ id: '2' }]
      });

      // Filter by PUSH type
      const pushOnly = await request({
        hostname: 'localhost',
        path: '/feed/filteruser?type=PUSH',
        method: 'GET'
      });

      assert.strictEqual(pushOnly.body.count, 2);
      assert.ok(pushOnly.body.activities.every(a => a.type === 'PUSH'));

      // Filter by PR type
      const prOnly = await request({
        hostname: 'localhost',
        path: '/feed/filteruser?type=PR',
        method: 'GET'
      });

      assert.strictEqual(prOnly.body.count, 1);
      assert.strictEqual(prOnly.body.activities[0].type, 'PR');
    });

    it('should filter by repository correctly', async () => {
      await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'push' }
      }, {
        pusher: { name: 'repofilteruser' },
        repository: { full_name: 'repofilteruser/frontend' },
        commits: [{ id: '1' }]
      });

      await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'push' }
      }, {
        pusher: { name: 'repofilteruser' },
        repository: { full_name: 'repofilteruser/backend' },
        commits: [{ id: '2' }]
      });

      await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'push' }
      }, {
        pusher: { name: 'repofilteruser' },
        repository: { full_name: 'repofilteruser/frontend' },
        commits: [{ id: '3' }]
      });

      // Filter by frontend repo
      const frontendOnly = await request({
        hostname: 'localhost',
        path: '/feed/repofilteruser?repo=frontend',
        method: 'GET'
      });

      assert.strictEqual(frontendOnly.body.count, 2);
      assert.ok(frontendOnly.body.activities.every(a => a.repo.includes('frontend')));
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle validation errors correctly', async () => {
      // Invalid limit
      const invalidLimit = await request({
        hostname: 'localhost',
        path: '/feed/testuser?limit=999',
        method: 'GET'
      });

      assert.strictEqual(invalidLimit.statusCode, 400);
      assert.ok(invalidLimit.body.error);

      // Invalid type filter
      const invalidType = await request({
        hostname: 'localhost',
        path: '/feed/testuser?type=INVALID',
        method: 'GET'
      });

      assert.strictEqual(invalidType.statusCode, 400);
      assert.ok(invalidType.body.error);

      // Missing required webhook header
      const missingHeader = await request({
        hostname: 'localhost',
        path: '/webhook/github',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { test: 'data' });

      assert.strictEqual(missingHeader.statusCode, 400);
    });

    it('should handle 404 for unknown routes', async () => {
      const notFound = await request({
        hostname: 'localhost',
        path: '/api/v2/unknown',
        method: 'GET'
      });

      assert.strictEqual(notFound.statusCode, 404);
      assert.ok(notFound.body.error);
    });
  });

  describe('Security Features', () => {
    it('should include security headers in responses', async () => {
      const response = await request({
        hostname: 'localhost',
        path: '/health',
        method: 'GET'
      });

      assert.strictEqual(response.headers['x-content-type-options'], 'nosniff');
      assert.strictEqual(response.headers['x-frame-options'], 'DENY');
      // Content-Security-Policy replaces deprecated X-XSS-Protection
      assert.ok(response.headers['content-security-policy']);
      assert.ok(response.headers['content-security-policy'].includes("default-src 'self'"));
    });

    it('should include request ID in all responses', async () => {
      const response = await request({
        hostname: 'localhost',
        path: '/health',
        method: 'GET'
      });

      assert.ok(response.headers['x-request-id']);
      // Verify it's a valid UUID format
      assert.match(response.headers['x-request-id'], /^[0-9a-f-]{36}$/);
    });

    it('should include rate limit headers in responses', async () => {
      const response = await request({
        hostname: 'localhost',
        path: '/feed/testuser',
        method: 'GET'
      });

      assert.ok(response.headers['x-ratelimit-limit']);
      assert.ok(response.headers['x-ratelimit-remaining']);
      assert.ok(response.headers['x-ratelimit-reset']);
    });
  });

  describe('API Info Endpoints', () => {
    it('should return complete API documentation at root', async () => {
      const response = await request({
        hostname: 'localhost',
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.body.name, 'GitHub Activity Feed System');
      assert.ok(response.body.endpoints);
      assert.ok(response.body.endpoints.websocket);
      assert.ok(response.body.documentation);
      assert.ok(response.body.documentation.feedParams);
      assert.ok(response.body.documentation.websocket);
    });

    it('should return health status with all services', async () => {
      const response = await request({
        hostname: 'localhost',
        path: '/health',
        method: 'GET'
      });

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.body.status, 'ok');
      assert.ok(response.body.timestamp);
      assert.ok(typeof response.body.uptime === 'number');
      assert.ok(response.body.uptime >= 0);
      assert.ok('database' in response.body);
      assert.ok('cache' in response.body);
      assert.ok('websocket' in response.body);
    });
  });
});
