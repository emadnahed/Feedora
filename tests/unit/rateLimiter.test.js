/**
 * Unit Tests - Rate Limiter
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { createRateLimiter, getClientId } = require('../../src/middleware/rateLimiter');

describe('Rate Limiter', () => {
  describe('getClientId', () => {
    it('should use x-api-key header if present', () => {
      const req = {
        headers: { 'x-api-key': 'my-api-key' },
        ip: '127.0.0.1'
      };
      assert.strictEqual(getClientId(req), 'my-api-key');
    });

    it('should use x-forwarded-for header if no api key', () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
        ip: '127.0.0.1'
      };
      assert.strictEqual(getClientId(req), '192.168.1.1');
    });

    it('should use ip if no headers present', () => {
      const req = {
        headers: {},
        ip: '127.0.0.1'
      };
      assert.strictEqual(getClientId(req), '127.0.0.1');
    });

    it('should return unknown if no identifier available', () => {
      const req = {
        headers: {}
      };
      assert.strictEqual(getClientId(req), 'unknown');
    });
  });

  describe('createRateLimiter', () => {
    it('should create a rate limiter middleware', () => {
      const limiter = createRateLimiter();
      assert.strictEqual(typeof limiter, 'function');
    });

    it('should skip rate limiting when skip option is true', async () => {
      const limiter = createRateLimiter({ skip: true });

      const req = { headers: {}, ip: '127.0.0.1' };
      const res = { setHeader: () => {} };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      await limiter(req, res, next);
      assert.strictEqual(nextCalled, true);
    });

    it('should allow requests under the limit', async () => {
      const limiter = createRateLimiter({
        windowMs: 1000,
        maxRequests: 5,
        keyPrefix: 'test:limit:'
      });

      const req = { headers: { 'x-api-key': 'test-client-' + Date.now() }, ip: '127.0.0.1' };
      const headers = {};
      const res = { setHeader: (key, value) => { headers[key] = value; } };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      await limiter(req, res, next);

      assert.strictEqual(nextCalled, true);
      assert.ok(headers['X-RateLimit-Limit']);
      assert.ok(headers['X-RateLimit-Remaining']);
      assert.ok(headers['X-RateLimit-Reset']);
    });

    it('should use custom key generator if provided', async () => {
      let capturedKey = null;
      const limiter = createRateLimiter({
        windowMs: 1000,
        maxRequests: 100,
        keyGenerator: (req) => {
          capturedKey = `custom:${req.customId}`;
          return capturedKey;
        }
      });

      const req = { customId: 'user123', headers: {}, ip: '127.0.0.1' };
      const res = { setHeader: () => {} };
      const next = () => {};

      await limiter(req, res, next);

      assert.strictEqual(capturedKey, 'custom:user123');
    });

    it('should set rate limit headers correctly', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 100,
        keyPrefix: 'test:headers:'
      });

      const req = { headers: { 'x-api-key': 'headers-test-' + Date.now() }, ip: '127.0.0.1' };
      const headers = {};
      const res = { setHeader: (key, value) => { headers[key] = value; } };
      const next = () => {};

      await limiter(req, res, next);

      assert.strictEqual(headers['X-RateLimit-Limit'], 100);
      assert.ok(headers['X-RateLimit-Remaining'] >= 0);
      assert.ok(typeof headers['X-RateLimit-Reset'] === 'number');
    });
  });

  describe('In-Memory Rate Limiting', () => {
    it('should track requests in memory when Redis is not available', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
        keyPrefix: 'test:memory:'
      });

      const clientId = 'memory-test-' + Date.now();
      const req = { headers: { 'x-api-key': clientId }, ip: '127.0.0.1' };
      const headers = {};
      const res = { setHeader: (key, value) => { headers[key] = value; } };
      const next = () => {};

      // First request
      await limiter(req, res, next);
      assert.strictEqual(headers['X-RateLimit-Remaining'], 2);

      // Second request
      await limiter(req, res, next);
      assert.strictEqual(headers['X-RateLimit-Remaining'], 1);

      // Third request
      await limiter(req, res, next);
      assert.strictEqual(headers['X-RateLimit-Remaining'], 0);
    });

    it('should block requests when limit is exceeded', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        keyPrefix: 'test:block:'
      });

      const clientId = 'block-test-' + Date.now();
      const req = { headers: { 'x-api-key': clientId }, ip: '127.0.0.1' };
      const headers = {};
      const res = { setHeader: (key, value) => { headers[key] = value; } };

      let nextCallCount = 0;
      let errorPassed = null;
      const next = (err) => {
        if (err) errorPassed = err;
        else nextCallCount++;
      };

      // First two requests should pass
      await limiter(req, res, next);
      await limiter(req, res, next);
      assert.strictEqual(nextCallCount, 2);

      // Third request should be blocked
      await limiter(req, res, next);
      assert.ok(errorPassed);
      assert.strictEqual(errorPassed.statusCode, 429);
    });
  });
});
