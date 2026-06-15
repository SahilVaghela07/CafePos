// =========================================================================
// DATABASE CONNECTION CONFIGURATION (SEQUELIZE)
// Purpose: Configures and establishes the connection to the database (SQLite for local dev, MySQL for production).
// Used in: backend/src/server.js and all models in backend/src/models/
// =========================================================================

const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Extract database details from the environment variables (loaded from .env file)
const dbDialect = process.env.DB_DIALECT || 'sqlite';
const dbStorage = process.env.DB_STORAGE || './data/database.sqlite';

let sequelize;

if (dbDialect === 'sqlite') {
  // SQLite configuration: file-based database
  
  // Resolve the absolute path for the SQLite database storage file
  const storagePath = path.resolve(dbStorage);
  const storageDir = path.dirname(storagePath);
  
  // Purpose: Ensure the parent folder (e.g. "./data") exists before Sequelize attempts to write the sqlite file
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
    console.log(`[Database Setup] Created directory for SQLite file storage: ${storageDir}`);
  }
  
  console.log(`[Database Connection] Initializing Sequelize with SQLite. Storage path: ${storagePath}`);
  
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false, // Turn off database query logging in console to keep terminal clean
    define: {
      timestamps: true // Adds createdAt and updatedAt columns automatically to all tables
    }
  });
} else {
  // MySQL configuration: server-based relational database (used in production environments)
  // Purpose: Allows seamless switching to MySQL by reading DATABASE_URL or database credentials from .env
  console.log(`[Database Connection] Initializing Sequelize with MySQL...`);
  
  sequelize = new Sequelize(process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cafe_pos',
    dialect: 'mysql',
    logging: false,
    define: {
      timestamps: true
    }
  });
}

// Export the sequelize database instance so it can be imported in models and the server entry point
module.exports = sequelize;
