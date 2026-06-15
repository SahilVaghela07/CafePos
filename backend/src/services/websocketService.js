// =========================================================================
// WEBSOCKET BROADCAST SERVICE
// Purpose: Manages live WebSocket connections for real-time screens (specifically KDS).
// Used in: backend/src/server.js to bind the server, and controllers to trigger events.
// =========================================================================

const ws = require('ws');

let wss = null;

// Initialize the WebSocket Server attached to our HTTP server
// Purpose: Binds the WebSocket listener to the same port as our Express API.
const initWebSocket = (server) => {
  wss = new ws.Server({ server });
  
  console.log('[WebSocket Service] WebSocket Server initialized.');

  wss.on('connection', (socket, req) => {
    const url = req.url;
    console.log(`[WebSocket Connection] New client connected on path: ${url}`);

    socket.on('message', (message) => {
      // Process incoming messages if KDS sends actions back to POS
      try {
        const parsed = JSON.parse(message);
        console.log('[WebSocket Message Received]:', parsed);
      } catch (err) {
        console.log('[WebSocket Message Parse Error]:', message);
      }
    });

    socket.on('close', () => {
      console.log('[WebSocket Disconnection] Client disconnected.');
    });
  });
};

// Broadcast data to all active KDS clients
// Purpose: Instantly updates the KDS screen in the kitchen when a cashier clicks "Send to Kitchen" or updates order items.
const broadcastKdsUpdate = (data) => {
  if (!wss) {
    console.log('[WebSocket Warning] Server not initialized. Cannot broadcast.');
    return;
  }

  const payload = JSON.stringify(data);
  let count = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === ws.OPEN) {
      client.send(payload);
      count++;
    }
  });

  console.log(`[WebSocket Broadcast] Sent update to ${count} active KDS clients. Event: ${data.event}`);
};

module.exports = {
  initWebSocket,
  broadcastKdsUpdate
};
