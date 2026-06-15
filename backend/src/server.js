// =========================================================================
// BACKEND SERVER ENTRY POINT
// Purpose: Boots the Express server, connects/syncs database tables, sets up routes,
// and starts the WebSocket server for real-time kitchen display.
// Used in: package.json (dev/start scripts)
// =========================================================================

const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

// Import database instance
const sequelize = require('./config/db');

// Import WebSocket helper service
const { initWebSocket } = require('./services/websocketService');

// Import routing groups
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const tableRoutes = require('./routes/tableRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const customerRoutes = require('./routes/customerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const server = http.createServer(app);

// 1. Configure Global Middlewares
// Purpose: Enable CORS for frontend cross-origin calls and parse JSON payloads.
app.use(cors());
app.use(express.json());

// 2. Health check route
app.use('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// 3. Register routing paths
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);

// 4. Global Error Handling Middleware
// Purpose: Catches any unhandled errors in route execution to keep the server from crashing.
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// 5. Connect Database, Sync tables, and boot Server
const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    // Authenticate database connection
    await sequelize.authenticate();
    console.log('[Database Connection] Connected successfully to SQL database.');

    // Sync models: creates tables if they don't exist
    // alter: true updates table schemas dynamically if columns are modified
    await sequelize.sync({ alter: true });
    console.log('[Database Sync] Database models synced successfully.');

    // Initialize the WebSocket KDS relay listener
    initWebSocket(server);

    // Start listening on HTTP port
    server.listen(PORT, () => {
      console.log(`========================================================`);
      console.log(` ODOO CAFE POS SERVER IS RUNNING`);
      console.log(` Port: ${PORT}`);
      console.log(` Mode: Local Development`);
      console.log(` REST API URL: http://localhost:${PORT}/api`);
      console.log(` WebSocket KDS URL: ws://localhost:${PORT}`);
      console.log(`========================================================`);
    });
  } catch (error) {
    console.error('[Server Boot Error] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
