/**
 * Unit Tests - Event Normalizer
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { normalizeEvent } = require('../../src/services/eventNormalizer');
const {
  pushPayload,
  pullRequestPayload,
  pullRequestMergedPayload,
  issuePayload,
  watchPayload
} = require('../fixtures/webhookPayloads');

describe('Event Normalizer', () => {
  describe('normalizeEvent', () => {
    it('should normalize push events', () => {
      const result = normalizeEvent('push', pushPayload);

      assert.ok(result);
      assert.strictEqual(result.type, 'PUSH');
      assert.strictEqual(result.username, 'testuser');
      assert.strictEqual(result.repo, 'testuser/test-repo');
      assert.strictEqual(result.message, 'Pushed 2 commits');
      assert.ok(result.id);
      assert.ok(result.timestamp);
    });

    it('should normalize pull request opened events', () => {
      const result = normalizeEvent('pull_request', pullRequestPayload);

      assert.ok(result);
      assert.strictEqual(result.type, 'PR');
      assert.strictEqual(result.username, 'testuser');
      assert.strictEqual(result.repo, 'testuser/test-repo');
      assert.ok(result.message.includes('Opened pull request'));
      assert.ok(result.message.includes('#42'));
    });

    it('should normalize merged pull request events', () => {
      const result = normalizeEvent('pull_request', pullRequestMergedPayload);

      assert.ok(result);
      assert.strictEqual(result.type, 'PR');
      assert.ok(result.message.includes('Merged pull request'));
    });

    it('should normalize issue events', () => {
      const result = normalizeEvent('issues', issuePayload);

      assert.ok(result);
      assert.strictEqual(result.type, 'ISSUE');
      assert.strictEqual(result.username, 'testuser');
      assert.ok(result.message.includes('Opened issue'));
      assert.ok(result.message.includes('#10'));
    });

    it('should normalize star (watch) events', () => {
      const result = normalizeEvent('watch', watchPayload);

      assert.ok(result);
      assert.strictEqual(result.type, 'STAR');
      assert.strictEqual(result.username, 'testuser');
      assert.strictEqual(result.message, 'Starred repository');
    });

    it('should return null for unsupported event types', () => {
      const result = normalizeEvent('fork', { repository: {} });

      assert.strictEqual(result, null);
    });

    it('should handle missing pusher name gracefully', () => {
      const payload = { ...pushPayload, pusher: {} };
      const result = normalizeEvent('push', payload);

      assert.ok(result);
      assert.strictEqual(result.username, 'unknown');
    });

    it('should generate unique IDs for each event', () => {
      const result1 = normalizeEvent('push', pushPayload);
      const result2 = normalizeEvent('push', pushPayload);

      assert.notStrictEqual(result1.id, result2.id);
    });

    it('should generate valid ISO timestamps', () => {
      const result = normalizeEvent('push', pushPayload);
      const timestamp = new Date(result.timestamp);

      assert.ok(!isNaN(timestamp.getTime()));
    });
  });
});
