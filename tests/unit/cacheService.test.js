/**
 * Unit Tests - Cache Service
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const {
  generateCacheKey,
  getCachedFeed,
  setCachedFeed,
  invalidateUserCache,
  clearCache
} = require('../../src/services/cacheService');

describe('Cache Service', () => {
  describe('generateCacheKey', () => {
    it('should generate consistent cache keys', () => {
      const key1 = generateCacheKey('testuser', { limit: 20, sort: 'desc' });
      const key2 = generateCacheKey('testuser', { limit: 20, sort: 'desc' });
      assert.strictEqual(key1, key2);
    });

    it('should include username in key', () => {
      const key = generateCacheKey('myuser', {});
      assert.ok(key.includes('myuser'));
    });

    it('should include all options in key', () => {
      const key = generateCacheKey('user', {
        limit: 10,
        cursor: 'abc123',
        type: 'PUSH',
        repo: 'user/repo',
        sort: 'asc',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });

      assert.ok(key.includes('l:10'));
      assert.ok(key.includes('c:abc123'));
      assert.ok(key.includes('t:PUSH'));
      assert.ok(key.includes('r:user/repo'));
      assert.ok(key.includes('s:asc'));
      assert.ok(key.includes('sd:2024-01-01'));
      assert.ok(key.includes('ed:2024-12-31'));
    });

    it('should generate different keys for different options', () => {
      const key1 = generateCacheKey('user', { limit: 10 });
      const key2 = generateCacheKey('user', { limit: 20 });
      assert.notStrictEqual(key1, key2);
    });

    it('should generate different keys for different users', () => {
      const key1 = generateCacheKey('user1', { limit: 10 });
      const key2 = generateCacheKey('user2', { limit: 10 });
      assert.notStrictEqual(key1, key2);
    });

    it('should handle empty options', () => {
      const key = generateCacheKey('user', {});
      assert.ok(key.includes('user'));
      assert.ok(key.includes('l:20')); // default limit
    });

    it('should handle undefined options values', () => {
      const key = generateCacheKey('user', {
        limit: 20,
        cursor: undefined,
        type: null
      });
      assert.ok(key.includes('c:'));
      assert.ok(key.includes('t:'));
    });
  });

  describe('Cache Operations (without Redis)', () => {
    // Note: These tests run without Redis connected, so they return null/do nothing

    it('should return null when cache is not connected', async () => {
      const result = await getCachedFeed('nonexistent', { limit: 20 });
      assert.strictEqual(result, null);
    });

    it('should not throw when setting cache without connection', async () => {
      const data = { activities: [], pagination: { total: 0, hasMore: false } };
      await assert.doesNotReject(async () => {
        await setCachedFeed('user', { limit: 20 }, data);
      });
    });

    it('should not throw when invalidating cache without connection', async () => {
      await assert.doesNotReject(async () => {
        await invalidateUserCache('user');
      });
    });

    it('should not throw when clearing cache without connection', async () => {
      await assert.doesNotReject(async () => {
        await clearCache();
      });
    });

    it('should return 0 when invalidating without connection', async () => {
      const result = await invalidateUserCache('user');
      assert.strictEqual(result, 0);
    });
  });

  describe('Cache Key Prefix', () => {
    it('should use correct prefix for feed keys', () => {
      const key = generateCacheKey('user', {});
      assert.ok(key.startsWith('feedora:feed:'));
    });
  });

  describe('TTL Configuration', () => {
    it('should accept custom TTL parameter', async () => {
      // This test verifies the function signature accepts TTL
      const data = { activities: [], pagination: { total: 0, hasMore: false } };
      await assert.doesNotReject(async () => {
        await setCachedFeed('user', { limit: 20 }, data, 600); // 10 minutes
      });
    });
  });
});
