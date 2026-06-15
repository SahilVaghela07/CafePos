// =========================================================================
// PRODUCT CATEGORY MODEL (SEQUELIZE Schema)
// Purpose: Defines schema for food/beverage categories (e.g. Coffee, Donut, Tea).
// Used in: backend/src/controllers/categoryController.js and is referenced in backend/src/models/Product.js
// =========================================================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '#cccccc' // Holds hexadecimal colors (e.g. #FF7D7D) to style product cards and category filters dynamically
  }
});

module.exports = Category;
