// =========================================================================
// WEBSOCKET CLIENT SERVICE
// Purpose: Establishes a persistent, real-time connection to the backend
//          WebSocket server to sync Kitchen (KDS) tickets and POS terminals.
// Used in: frontend/src/views/KdsView.jsx and POS ordering updates.
// =========================================================================

const WS_URL = 'ws://localhost:8000';

let socket = null;
let listeners = new Set();
let reconnectInterval = 5000; // Retry connection every 5s on drop

// Connect to the backend WebSocket server
// Purpose: Sets up message listeners, handles auto-reconnect, and maintains state.
export const connectWebSocket = () => {
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
    return;
  }

  console.log(`[WebSocket Client] Attempting to connect to ${WS_URL}...`);
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log('[WebSocket Client] Connected to real-time notification server.');
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[WebSocket Client] Event received:', data);
      
      // Notify all registered listener callbacks of the incoming real-time payload
      listeners.forEach((callback) => callback(data));
    } catch (error) {
      console.error('[WebSocket Client] Message parse error:', error);
    }
  };

  socket.onclose = (e) => {
    console.log(`[WebSocket Client] Connection closed: ${e.reason}. Reconnecting in ${reconnectInterval / 1000}s...`);
    socket = null;
    
    // Auto-reconnect loop
    setTimeout(() => {
      connectWebSocket();
    }, reconnectInterval);
  };

  socket.onerror = (error) => {
    console.error('[WebSocket Client] Socket error:', error);
    socket.close();
  };
};

// Subscribe a component callback to listen for real-time WebSocket events
// Purpose: Allows views (like the KDS page) to register a function that triggers state refresh on new orders.
export const subscribeToWs = (callback) => {
  listeners.add(callback);
  
  // Return an unsubscribe handler to clean up listeners on component unmount
  return () => {
    listeners.delete(callback);
  };
};

// Send messages/actions back to the WebSocket server if needed
export const sendWsMessage = (data) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  } else {
    console.warn('[WebSocket Client] Socket is not open. Cannot send message:', data);
  }
};
