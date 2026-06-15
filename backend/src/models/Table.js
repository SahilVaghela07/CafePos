// =========================================================================
// TABLE MODEL (SEQUELIZE Schema)
// Purpose: Defines schema for dining tables linked to a specific floor.
// Used in: backend/src/controllers/tableController.js and associated with Floor and Order models
// =========================================================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Floor = require('./Floor');

const Table = sequelize.define('Table', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  tableNumber: {
    type: DataTypes.STRING, // e.g. "Table 1" or "T1"
    allowNull: false
  },
  seats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4,
    validate: {
      min: 1
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true // Active configuration status (whether this table is currently in use/displayed in POS)
  }
});

// Relationships / Associations:
// Table belongs to a Floor (creates floorId foreign key column automatically)
// Floor has many Tables
Table.belongsTo(Floor, { foreignKey: 'floorId', as: 'floor' });
Floor.hasMany(Table, { foreignKey: 'floorId', as: 'tables' });

module.exports = Table;
