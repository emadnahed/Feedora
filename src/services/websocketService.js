/**
 * WebSocket Service
 * Provides real-time activity feed updates via WebSocket
 */

const WebSocket = require('ws');
const logger = require('../utils/logger');

let wss = null;
const subscriptions = new Map(); // username -> Set of WebSocket clients

/**
 * Initialize WebSocket server
 * @param {http.Server} server - HTTP server to attach to
 * @returns {WebSocket.Server}
 */
function initialize(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', handleConnection);

  wss.on('error', (error) => {
    logger.error('WebSocket server error', { error: error.message });
  });

  logger.info('WebSocket server initialized');
  return wss;
}

/**
 * Handle new WebSocket connection
 * @param {WebSocket} ws - WebSocket client
 * @param {http.IncomingMessage} req - HTTP request
 */
function handleConnection(ws, req) {
  const clientId = generateClientId();
  ws.clientId = clientId;
  ws.subscribedUsers = new Set();
  ws.isAlive = true;

  logger.debug('WebSocket client connected', { clientId });

  // Send welcome message
  sendMessage(ws, {
    type: 'connected',
    clientId,
    message: 'Connected to Feedora real-time feed'
  });

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleClientMessage(ws, message);
    } catch (error) {
      sendError(ws, 'Invalid JSON message');
    }
  });

  // Handle pong for heartbeat
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Handle close
  ws.on('close', () => {
    handleDisconnect(ws);
  });

  // Handle error
  ws.on('error', (error) => {
    logger.error('WebSocket client error', { clientId, error: error.message });
  });
}

/**
 * Handle client message
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} message - Parsed message
 */
function handleClientMessage(ws, message) {
  const { type, username } = message;

  switch (type) {
    case 'subscribe':
      if (!username) {
        sendError(ws, 'Username required for subscription');
        return;
      }
      subscribeToUser(ws, username);
      break;

    case 'unsubscribe':
      if (!username) {
        sendError(ws, 'Username required for unsubscription');
        return;
      }
      unsubscribeFromUser(ws, username);
      break;

    case 'ping':
      sendMessage(ws, { type: 'pong', timestamp: new Date().toISOString() });
      break;

    default:
      sendError(ws, `Unknown message type: ${type}`);
  }
}

/**
 * Subscribe client to user's feed
 * @param {WebSocket} ws - WebSocket client
 * @param {string} username - Username to subscribe to
 */
function subscribeToUser(ws, username) {
  // Add to subscriptions map
  if (!subscriptions.has(username)) {
    subscriptions.set(username, new Set());
  }
  subscriptions.get(username).add(ws);

  // Track on client
  ws.subscribedUsers.add(username);

  logger.debug('Client subscribed', { clientId: ws.clientId, username });

  sendMessage(ws, {
    type: 'subscribed',
    username,
    message: `Subscribed to ${username}'s feed`
  });
}

/**
 * Unsubscribe client from user's feed
 * @param {WebSocket} ws - WebSocket client
 * @param {string} username - Username to unsubscribe from
 */
function unsubscribeFromUser(ws, username) {
  // Remove from subscriptions map
  if (subscriptions.has(username)) {
    subscriptions.get(username).delete(ws);
    if (subscriptions.get(username).size === 0) {
      subscriptions.delete(username);
    }
  }

  // Remove from client tracking
  ws.subscribedUsers.delete(username);

  logger.debug('Client unsubscribed', { clientId: ws.clientId, username });

  sendMessage(ws, {
    type: 'unsubscribed',
    username,
    message: `Unsubscribed from ${username}'s feed`
  });
}

/**
 * Handle client disconnect
 * @param {WebSocket} ws - WebSocket client
 */
function handleDisconnect(ws) {
  // Unsubscribe from all users
  for (const username of ws.subscribedUsers) {
    if (subscriptions.has(username)) {
      subscriptions.get(username).delete(ws);
      if (subscriptions.get(username).size === 0) {
        subscriptions.delete(username);
      }
    }
  }

  logger.debug('WebSocket client disconnected', { clientId: ws.clientId });
}

/**
 * Broadcast activity to subscribed clients
 * @param {Object} activity - Activity to broadcast
 */
function broadcastActivity(activity) {
  if (!wss) return;

  const { username } = activity;
  const clients = subscriptions.get(username);

  if (!clients || clients.size === 0) {
    return;
  }

  const message = {
    type: 'activity',
    activity
  };

  let broadcastCount = 0;
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      sendMessage(client, message);
      broadcastCount++;
    }
  }

  logger.debug('Activity broadcasted', { username, clients: broadcastCount });
}

/**
 * Send message to client
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} data - Data to send
 */
function sendMessage(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Send error to client
 * @param {WebSocket} ws - WebSocket client
 * @param {string} message - Error message
 */
function sendError(ws, message) {
  sendMessage(ws, { type: 'error', message });
}

/**
 * Generate unique client ID
 * @returns {string}
 */
function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start heartbeat interval to detect dead connections
 * @param {number} interval - Interval in milliseconds
 */
function startHeartbeat(interval = 30000) {
  setInterval(() => {
    if (!wss) return;

    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, interval);
}

/**
 * Get connection stats
 * @returns {Object}
 */
function getStats() {
  if (!wss) {
    return { connected: 0, subscriptions: 0 };
  }

  return {
    connected: wss.clients.size,
    subscriptions: subscriptions.size,
    subscribersByUser: Object.fromEntries(
      Array.from(subscriptions.entries()).map(([user, clients]) => [user, clients.size])
    )
  };
}

/**
 * Close WebSocket server
 * @returns {Promise<void>}
 */
async function close() {
  if (!wss) return;

  return new Promise((resolve) => {
    wss.close(() => {
      logger.info('WebSocket server closed');
      wss = null;
      subscriptions.clear();
      resolve();
    });
  });
}

module.exports = {
  initialize,
  broadcastActivity,
  startHeartbeat,
  getStats,
  close
};
