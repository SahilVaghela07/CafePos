// =========================================================================
// PRODUCT MODEL (SEQUELIZE Schema)
// Purpose: Defines schema for food/beverage menu products.
// Used in: backend/src/controllers/productController.js and is associated with the Category model
// =========================================================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Category = require('./Category');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.0
    }
  },
  uom: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pcs' // Unit of Measure (e.g. per piece/pcs, per kg, per litre/L)
  },
  tax: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 5.0 // Tax percentage (e.g., 5.0 representing 5% tax)
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

// Relationships / Associations:
// Product belongs to a Category (creates categoryId foreign key column automatically)
// Category has many Products
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });

module.exports = Product;
