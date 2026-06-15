// =========================================================================
// COUPON & PROMOTION MODEL (SEQUELIZE Schema)
// Purpose: Handles both manual coupon codes and automated (quantity-based/amount-based) promotions.
// Used in: backend/src/controllers/promotionController.js and cart validation in backend/src/controllers/orderController.js
// =========================================================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Product = require('./Product');

const Promotion = sequelize.define('Promotion', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('Coupon', 'Automated'),
    allowNull: false // Coupon: requires manual code entry at checkout. Automated: fires automatically based on rules.
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true, // Unique coupon code (e.g. "CAFE10"). Only required when type is 'Coupon'.
    unique: true
  },
  applyOn: {
    type: DataTypes.ENUM('Product', 'Order'),
    allowNull: false,
    defaultValue: 'Order' // Product: applies to individual item quantity. Order: applies to total cart value.
  },
  minQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1 // Minimum quantity threshold (for Automated Product-level promos, e.g. "Buy 3 get discount")
  },
  minOrderAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00 // Minimum order amount threshold (for Automated Order-level promos, e.g. "Spend $50, get discount")
  },
  discountType: {
    type: DataTypes.ENUM('Percentage', 'Fixed'),
    allowNull: false
  },
  discountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false // e.g. 10.00 representing 10% or $10 depending on discountType
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
});

// Relationships / Associations:
// A product-level automated promotion points to a specific target Product
Promotion.belongsTo(Product, { foreignKey: 'productId', as: 'product', constraints: false });

module.exports = Promotion;
