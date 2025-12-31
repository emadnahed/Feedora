/**
 * Integration Tests - Webhook Endpoints
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../../src/app');
const { clearActivities } = require('../../src/store/activityStore');
const { pushPayload, pullRequestPayload, issuePayload } = require('../fixtures/webhookPayloads');

let server;
let baseUrl;

// Helper to make HTTP requests
function request(options, body = null) {
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

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

describe('Webhook Endpoints', () => {
  beforeEach(async () => {
    clearActivities();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  describe('POST /webhook/github', () => {
    it('should accept valid push event', async () => {
      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/webhook/github',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'push'
        }
      }, pushPayload);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.message, 'Activity recorded');
      assert.ok(res.body.activity);
      assert.strictEqual(res.body.activity.type, 'PUSH');
    });

    it('should accept valid pull request event', async () => {
      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/webhook/github',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'pull_request'
        }
      }, pullRequestPayload);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.activity.type, 'PR');
    });

    it('should return 400 for missing X-GitHub-Event header', async () => {
      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/webhook/github',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, pushPayload);

      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.error);
    });

    it('should return 200 for unsupported event type', async () => {
      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/webhook/github',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'fork'
        }
      }, { repository: {} });

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.message.includes('not supported'));
    });

    it('should include request ID in response headers', async () => {
      const { port } = server.address();
      const res = await request({
        hostname: 'localhost',
        port,
        path: '/webhook/github',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'push'
        }
      }, pushPayload);

      assert.ok(res.headers['x-request-id']);
    });
  });
});
