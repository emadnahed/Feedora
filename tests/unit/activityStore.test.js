/**
 * Unit Tests - Activity Store
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const {
  addActivity,
  getActivitiesByUser,
  getActivityCount,
  clearActivities
} = require('../../src/store/activityStore');

describe('Activity Store', () => {
  beforeEach(() => {
    clearActivities();
  });

  describe('addActivity', () => {
    it('should add an activity to the store', () => {
      const activity = {
        id: '1',
        username: 'testuser',
        type: 'PUSH',
        repo: 'testuser/test-repo',
        message: 'Pushed 1 commit',
        timestamp: new Date().toISOString()
      };

      addActivity(activity);
      const count = getActivityCount('testuser');

      assert.strictEqual(count, 1);
    });

    it('should add multiple activities for the same user', () => {
      const activity1 = {
        id: '1',
        username: 'testuser',
        type: 'PUSH',
        repo: 'testuser/repo1',
        message: 'Pushed 1 commit',
        timestamp: new Date().toISOString()
      };

      const activity2 = {
        id: '2',
        username: 'testuser',
        type: 'PR',
        repo: 'testuser/repo2',
        message: 'Opened PR',
        timestamp: new Date().toISOString()
      };

      addActivity(activity1);
      addActivity(activity2);

      assert.strictEqual(getActivityCount('testuser'), 2);
    });
  });

  describe('getActivitiesByUser', () => {
    it('should return empty result for unknown user', () => {
      const result = getActivitiesByUser('unknown');

      assert.strictEqual(result.activities.length, 0);
      assert.strictEqual(result.pagination.total, 0);
    });

    it('should return activities sorted by timestamp (newest first)', () => {
      const now = new Date();
      const activities = [
        { id: '1', username: 'testuser', type: 'PUSH', repo: 'r', message: 'm', timestamp: new Date(now - 3000).toISOString() },
        { id: '2', username: 'testuser', type: 'PR', repo: 'r', message: 'm', timestamp: new Date(now - 1000).toISOString() },
        { id: '3', username: 'testuser', type: 'ISSUE', repo: 'r', message: 'm', timestamp: new Date(now - 2000).toISOString() }
      ];

      activities.forEach(addActivity);

      const result = getActivitiesByUser('testuser');

      assert.strictEqual(result.activities[0].id, '2'); // Most recent
      assert.strictEqual(result.activities[1].id, '3');
      assert.strictEqual(result.activities[2].id, '1'); // Oldest
    });

    it('should support ascending sort order', () => {
      const now = new Date();
      const activities = [
        { id: '1', username: 'testuser', type: 'PUSH', repo: 'r', message: 'm', timestamp: new Date(now - 3000).toISOString() },
        { id: '2', username: 'testuser', type: 'PR', repo: 'r', message: 'm', timestamp: new Date(now - 1000).toISOString() }
      ];

      activities.forEach(addActivity);

      const result = getActivitiesByUser('testuser', { sort: 'asc' });

      assert.strictEqual(result.activities[0].id, '1'); // Oldest first
      assert.strictEqual(result.activities[1].id, '2');
    });

    it('should filter by type', () => {
      const activities = [
        { id: '1', username: 'testuser', type: 'PUSH', repo: 'r', message: 'm', timestamp: new Date().toISOString() },
        { id: '2', username: 'testuser', type: 'PR', repo: 'r', message: 'm', timestamp: new Date().toISOString() },
        { id: '3', username: 'testuser', type: 'PUSH', repo: 'r', message: 'm', timestamp: new Date().toISOString() }
      ];

      activities.forEach(addActivity);

      const result = getActivitiesByUser('testuser', { type: 'PUSH' });

      assert.strictEqual(result.activities.length, 2);
      assert.ok(result.activities.every(a => a.type === 'PUSH'));
    });

    it('should filter by repository', () => {
      const activities = [
        { id: '1', username: 'testuser', type: 'PUSH', repo: 'testuser/repo1', message: 'm', timestamp: new Date().toISOString() },
        { id: '2', username: 'testuser', type: 'PUSH', repo: 'testuser/repo2', message: 'm', timestamp: new Date().toISOString() }
      ];

      activities.forEach(addActivity);

      const result = getActivitiesByUser('testuser', { repo: 'repo1' });

      assert.strictEqual(result.activities.length, 1);
      assert.strictEqual(result.activities[0].repo, 'testuser/repo1');
    });

    it('should respect limit parameter', () => {
      const activities = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        username: 'testuser',
        type: 'PUSH',
        repo: 'r',
        message: 'm',
        timestamp: new Date().toISOString()
      }));

      activities.forEach(addActivity);

      const result = getActivitiesByUser('testuser', { limit: 5 });

      assert.strictEqual(result.activities.length, 5);
      assert.strictEqual(result.pagination.hasMore, true);
    });

    it('should support cursor-based pagination', () => {
      const now = new Date();
      const activities = Array.from({ length: 5 }, (_, i) => ({
        id: String(i),
        username: 'testuser',
        type: 'PUSH',
        repo: 'r',
        message: 'm',
        timestamp: new Date(now - i * 1000).toISOString()
      }));

      activities.forEach(addActivity);

      // Get first page
      const page1 = getActivitiesByUser('testuser', { limit: 2 });
      assert.strictEqual(page1.activities.length, 2);
      assert.ok(page1.pagination.hasMore);
      assert.ok(page1.pagination.nextCursor);

      // Get second page using cursor
      const page2 = getActivitiesByUser('testuser', {
        limit: 2,
        cursor: page1.pagination.nextCursor
      });
      assert.strictEqual(page2.activities.length, 2);
      assert.ok(page2.pagination.hasMore);

      // Get third page
      const page3 = getActivitiesByUser('testuser', {
        limit: 2,
        cursor: page2.pagination.nextCursor
      });
      assert.strictEqual(page3.activities.length, 1);
      assert.strictEqual(page3.pagination.hasMore, false);
    });
  });

  describe('clearActivities', () => {
    it('should clear all activities', () => {
      addActivity({
        id: '1',
        username: 'testuser',
        type: 'PUSH',
        repo: 'r',
        message: 'm',
        timestamp: new Date().toISOString()
      });

      clearActivities();

      assert.strictEqual(getActivityCount('testuser'), 0);
    });
  });
});
