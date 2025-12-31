/**
 * Integration Tests - Feed Endpoints
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { setupTestDb, clearTestDb, teardownTestDb } = require('../setup');
const { app } = require('../../src/app');
const { addActivity, clearActivities } = require('../../src/store/activityStore');

let server;

// Helper to make HTTP requests
function request(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
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
    req.end();
  });
}

// Helper to create test activities
async function createTestActivities(username, count) {
  const now = new Date();
  const types = ['PUSH', 'PR', 'ISSUE', 'STAR'];

  for (let i = 0; i < count; i++) {
    await addActivity({
      id: `activity-${i}`,
      username,
      type: types[i % types.length],
      repo: `${username}/repo-${i % 3}`,
      message: `Test activity ${i}`,
      timestamp: new Date(now - i * 60000).toISOString()
    });
  }
}

describe('Feed Endpoints', () => {
  before(async () => {
    await setupTestDb();
  });

  after(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearActivities();
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  describe('GET /feed/:username', () => {
    it('should return empty feed for unknown user', async () => {
      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/feed/unknown',
        method: 'GET'
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.username, 'unknown');
      assert.strictEqual(res.body.count, 0);
      assert.strictEqual(res.body.activities.length, 0);
    });

    it('should return activities for user', async () => {
      await createTestActivities('testuser', 5);

      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/feed/testuser',
        method: 'GET'
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.username, 'testuser');
      assert.strictEqual(res.body.count, 5);
      assert.strictEqual(res.body.activities.length, 5);
    });

    it('should respect limit parameter', async () => {
      await createTestActivities('testuser', 10);

      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/feed/testuser?limit=3',
        method: 'GET'
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.count, 3);
      assert.strictEqual(res.body.pagination.hasMore, true);
    });

    it('should filter by type', async () => {
      await createTestActivities('testuser', 8);

      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/feed/testuser?type=PUSH',
        method: 'GET'
      });

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.activities.every(a => a.type === 'PUSH'));
    });

    it('should filter by repository', async () => {
      await createTestActivities('testuser', 6);

      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/feed/testuser?repo=repo-0',
        method: 'GET'
      });

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.activities.every(a => a.repo.includes('repo-0')));
    });

    it('should support pagination with cursor', async () => {
      await createTestActivities('testuser', 10);

      const { port } = server.address();

      // Get first page
      const page1 = await request({
        hostname: 'localhost',
        port,
        path: '/feed/testuser?limit=5',
        method: 'GET'
      });

      assert.strictEqual(page1.body.count, 5);
      assert.ok(page1.body.pagination.nextCursor);

      // Get second page
      const page2 = await request({
        hostname: 'localhost',
        port,
        path: `/feed/testuser?limit=5&cursor=${page1.body.pagination.nextCursor}`,
        method: 'GET'
      });

      assert.strictEqual(page2.body.count, 5);
      assert.strictEqual(page2.body.pagination.hasMore, false);

      // Verify no duplicate activities
      const page1Ids = page1.body.activities.map(a => a.id);
      const page2Ids = page2.body.activities.map(a => a.id);
      const allUnique = new Set([...page1Ids, ...page2Ids]).size === 10;
      assert.ok(allUnique);
    });

    it('should return 400 for invalid limit', async () => {
      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/feed/testuser?limit=500',
        method: 'GET'
      });

      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.error);
    });

    it('should return 400 for invalid type', async () => {
      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/feed/testuser?type=INVALID',
        method: 'GET'
      });

      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.error);
    });

    it('should include pagination metadata', async () => {
      await createTestActivities('testuser', 5);

      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/feed/testuser',
        method: 'GET'
      });

      assert.ok('pagination' in res.body);
      assert.ok('total' in res.body.pagination);
      assert.ok('hasMore' in res.body.pagination);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/health',
        method: 'GET'
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.status, 'ok');
      assert.ok(res.body.timestamp);
      assert.ok(res.body.uptime >= 0);
    });
  });

  describe('GET /', () => {
    it('should return API info', async () => {
      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/',
        method: 'GET'
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.name, 'GitHub Activity Feed System');
      assert.ok(res.body.endpoints);
      assert.ok(res.body.documentation);
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/unknown/route',
        method: 'GET'
      });

      assert.strictEqual(res.statusCode, 404);
      assert.ok(res.body.error);
    });
  });
});
