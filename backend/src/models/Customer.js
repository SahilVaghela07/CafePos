// =========================================================================
// CUSTOMER MODEL (SEQUELIZE Schema)
// Purpose: Handles profile information for customers visiting the cafe.
// Used in: backend/src/controllers/customerController.js and linked to Orders for tracking purchases
// =========================================================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true // Used for customer lookup and loyalty reference
  }
});

module.exports = Customer;
