// =========================================================================
// ORDER MODEL (SEQUELIZE Schema)
// Purpose: Main table tracking sales transactions, totals, tables, and KDS stages.
// Used in: backend/src/controllers/orderController.js and reports generation in backend/src/controllers/reportController.js
// =========================================================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const Table = require('./Table');
const Customer = require('./Customer');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // Unique ticket number (e.g. "#2206")
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Paid', 'Cancelled'),
    allowNull: false,
    defaultValue: 'Draft'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00 // Total discount applied to this order
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  paymentMethod: {
    type: DataTypes.ENUM('Cash', 'Card', 'UPI'),
    allowNull: true // Null for draft orders until payment is processed
  },
  paymentReference: {
    type: DataTypes.STRING,
    allowNull: true // Cashier enters Transaction Reference for Cards, system stores reference
  },
  kdsStatus: {
    type: DataTypes.ENUM('To Cook', 'Preparing', 'Completed'),
    allowNull: false,
    defaultValue: 'To Cook' // Stage of the order ticket on the Kitchen Display
  }
});

// Relationships / Associations:
// Order belongs to a Creator/Employee (User model)
Order.belongsTo(User, { foreignKey: 'userId', as: 'employee' });
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });

// Order belongs to a Table (optional to support takeaways, but linked to floor plans)
Order.belongsTo(Table, { foreignKey: 'tableId', as: 'table' });
Table.hasMany(Order, { foreignKey: 'tableId', as: 'orders' });

// Order belongs to a Customer (optional link)
Order.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(Order, { foreignKey: 'customerId', as: 'orders' });

module.exports = Order;
