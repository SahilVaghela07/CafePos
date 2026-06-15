// =========================================================================
// ORDER ITEM MODEL (SEQUELIZE Schema)
// Purpose: Tracks individual products added to a cart/order, their sale price, and kitchen completion states.
// Used in: backend/src/controllers/orderController.js and KDS services
// =========================================================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Order = require('./Order');
const Product = require('./Product');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false // Capture exact price at the moment of sale (in case catalog price changes later)
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00 // Product-level discount applied to this item line
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false // line total (quantity * price - discountAmount)
  },
  isCompletedInKds: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false // Tracks if kitchen staff has clicked this specific item (visual strikethrough in KDS)
  }
});

// Relationships / Associations:
// OrderItem belongs to an Order
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });

// OrderItem belongs to a Product
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });

module.exports = OrderItem;
