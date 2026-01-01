/**
 * Unit Tests - WebSocket Service
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const WebSocket = require('ws');
const websocketService = require('../../src/services/websocketService');

describe('WebSocket Service', () => {
  let server;
  let port;
  const openConnections = [];

  before(async () => {
    server = http.createServer();
    websocketService.initialize(server);
    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    // Close all open connections
    for (const ws of openConnections) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
    await websocketService.close();
    await new Promise((resolve) => server.close(resolve));
  });

  // Helper: Create connected websocket that has received welcome message
  async function createConnectedWS() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}/ws`);
      openConnections.push(ws);

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      // Set up message handler BEFORE connection opens
      ws.once('message', (data) => {
        clearTimeout(timeout);
        const welcomeMsg = JSON.parse(data.toString());
        if (welcomeMsg.type === 'connected') {
          resolve(ws);
        } else {
          reject(new Error('Expected connected message'));
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  // Helper: Wait for next message with timeout
  function waitForMessage(ws, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, timeoutMs);

      ws.once('message', (data) => {
        clearTimeout(timeout);
        resolve(JSON.parse(data.toString()));
      });
    });
  }

  describe('Connection', () => {
    it('should accept WebSocket connections', async () => {
      const ws = new WebSocket(`ws://localhost:${port}/ws`);
      openConnections.push(ws);

      const message = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 3000);
        ws.once('message', (data) => {
          clearTimeout(timeout);
          resolve(JSON.parse(data.toString()));
        });
        ws.on('error', reject);
      });

      assert.strictEqual(message.type, 'connected');
      assert.ok(message.clientId);
      assert.ok(message.message);

      ws.close();
    });

    it('should track connected clients in stats', async () => {
      const initialStats = websocketService.getStats();
      const initialCount = initialStats.connected;

      const ws = await createConnectedWS();

      // Wait for connection to be registered
      await new Promise(r => setTimeout(r, 100));

      const stats = websocketService.getStats();
      assert.ok(stats.connected >= initialCount);

      ws.close();
    });
  });

  describe('Subscriptions', () => {
    it('should handle subscribe messages', async () => {
      const ws = await createConnectedWS();

      // Send subscribe message
      ws.send(JSON.stringify({ type: 'subscribe', username: 'testuser' }));

      const response = await waitForMessage(ws);

      assert.strictEqual(response.type, 'subscribed');
      assert.strictEqual(response.username, 'testuser');

      ws.close();
    });

    it('should handle unsubscribe messages', async () => {
      const ws = await createConnectedWS();

      // Subscribe first
      ws.send(JSON.stringify({ type: 'subscribe', username: 'testuser2' }));
      await waitForMessage(ws);

      // Now unsubscribe
      ws.send(JSON.stringify({ type: 'unsubscribe', username: 'testuser2' }));

      const response = await waitForMessage(ws);

      assert.strictEqual(response.type, 'unsubscribed');
      assert.strictEqual(response.username, 'testuser2');

      ws.close();
    });

    it('should return error for subscribe without username', async () => {
      const ws = await createConnectedWS();

      // Send subscribe without username
      ws.send(JSON.stringify({ type: 'subscribe' }));

      const response = await waitForMessage(ws);

      assert.strictEqual(response.type, 'error');
      assert.ok(response.message.includes('Username required'));

      ws.close();
    });
  });

  describe('Ping/Pong', () => {
    it('should respond to ping messages', async () => {
      const ws = await createConnectedWS();

      // Send ping
      ws.send(JSON.stringify({ type: 'ping' }));

      const response = await waitForMessage(ws);

      assert.strictEqual(response.type, 'pong');
      assert.ok(response.timestamp);

      ws.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON messages', async () => {
      const ws = await createConnectedWS();

      // Send invalid JSON
      ws.send('not valid json');

      const response = await waitForMessage(ws);

      assert.strictEqual(response.type, 'error');
      assert.ok(response.message.includes('Invalid JSON'));

      ws.close();
    });

    it('should handle unknown message types', async () => {
      const ws = await createConnectedWS();

      // Send unknown type
      ws.send(JSON.stringify({ type: 'unknown_type' }));

      const response = await waitForMessage(ws);

      assert.strictEqual(response.type, 'error');
      assert.ok(response.message.includes('Unknown message type'));

      ws.close();
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast activity to subscribed clients', async () => {
      const ws = await createConnectedWS();

      // Subscribe to user
      ws.send(JSON.stringify({ type: 'subscribe', username: 'broadcastuser' }));
      await waitForMessage(ws);

      // Broadcast an activity
      const activity = {
        id: 'test-activity-1',
        type: 'PUSH',
        username: 'broadcastuser',
        repo: 'broadcastuser/repo',
        message: 'Test push',
        timestamp: new Date().toISOString()
      };

      websocketService.broadcastActivity(activity);

      const response = await waitForMessage(ws);

      assert.strictEqual(response.type, 'activity');
      assert.deepStrictEqual(response.activity, activity);

      ws.close();
    });

    it('should not broadcast to unsubscribed clients', async () => {
      const ws = await createConnectedWS();

      // Don't subscribe - just wait for potential broadcast
      const activity = {
        id: 'test-activity-2',
        type: 'PUSH',
        username: 'otheruser',
        repo: 'otheruser/repo',
        message: 'Test push',
        timestamp: new Date().toISOString()
      };

      websocketService.broadcastActivity(activity);

      // Wait a bit to ensure no message is received
      let messageReceived = false;
      ws.once('message', () => {
        messageReceived = true;
      });

      await new Promise(r => setTimeout(r, 300));
      assert.strictEqual(messageReceived, false);

      ws.close();
    });
  });

  describe('Stats', () => {
    it('should return valid stats object', () => {
      const stats = websocketService.getStats();

      assert.ok(typeof stats.connected === 'number');
      assert.ok(typeof stats.subscriptions === 'number');
      assert.ok(stats.connected >= 0);
      assert.ok(stats.subscriptions >= 0);
    });
  });
});
