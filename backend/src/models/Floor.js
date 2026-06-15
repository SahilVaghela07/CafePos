// =========================================================================
// FLOOR PLAN MODEL (SEQUELIZE Schema)
// Purpose: Defines schema for Floors (e.g. Ground Floor, Rooftop, Floor 1).
// Used in: backend/src/controllers/tableController.js and backend/src/models/Table.js
// =========================================================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Floor = sequelize.define('Floor', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
});

module.exports = Floor;
