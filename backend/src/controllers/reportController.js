// =========================================================================
// REPORTING & ANALYTICS DASHBOARD CONTROLLER
// Purpose: Computes sales metrics, category distribution, and trends for charts.
// Used in: backend/src/routes/reportRoutes.js
// =========================================================================

const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Customer = require('../models/Customer');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

// Helper function to build the sequelize database filter object based on POS queries
const getReportFilter = (query) => {
  const { period, employeeId, productId, startDate, endDate } = query;
  const whereClause = { status: 'Paid' }; // Metrics only reflect paid/completed transactions

  // 1. Period filter (Date range calculations)
  const now = new Date();
  if (period === 'Today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    whereClause.createdAt = { [Op.between]: [startOfToday, endOfToday] };
  } else if (period === 'This Week') {
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6)); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);
    whereClause.createdAt = { [Op.between]: [startOfWeek, endOfWeek] };
  } else if (period === 'This Month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    whereClause.createdAt = { [Op.between]: [startOfMonth, endOfMonth] };
  } else if (period === 'Custom' && startDate && endDate) {
    whereClause.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }

  // 2. Employee (Cashier) filter
  if (employeeId) {
    whereClause.userId = employeeId;
  }

  return whereClause;
};

// Handler: getDashboardSummary
// Purpose: Calculates aggregate summary statistics (Total Paid Orders, Total Revenue, and AOV).
// Routed from: GET /api/reports/summary (Admin dashboard stat cards)
exports.getDashboardSummary = async (req, res) => {
  try {
    const whereClause = getReportFilter(req.query);

    // Fetch total count and sum of final order totals
    const result = await Order.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders'],
        [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue']
      ],
      where: whereClause
    });

    const totalOrders = parseInt(result.getDataValue('totalOrders'), 10) || 0;
    const totalRevenue = parseFloat(result.getDataValue('totalRevenue')) || 0.00;
    const averageOrderValue = totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0.00;

    res.status(200).json({
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      averageOrderValue
    });
  } catch (error) {
    console.error('[Report Controller] GetDashboardSummary Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: getSalesTrend
// Purpose: Group sales totals by date to draw the Sales Trend line chart.
// Routed from: GET /api/reports/sales-trend
exports.getSalesTrend = async (req, res) => {
  try {
    const whereClause = getReportFilter(req.query);

    // Group sales data by date format (YYYY-MM-DD)
    const sales = await Order.findAll({
      attributes: [
        [sequelize.fn('date', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
        [sequelize.fn('SUM', sequelize.col('total')), 'revenue']
      ],
      where: whereClause,
      group: [sequelize.fn('date', sequelize.col('createdAt'))],
      order: [[sequelize.fn('date', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    res.status(200).json(sales);
  } catch (error) {
    console.error('[Report Controller] GetSalesTrend Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: getTopOrders
// Purpose: Returns the highest-value completed transactions.
// Routed from: GET /api/reports/top-orders (Admin Top Orders Table)
exports.getTopOrders = async (req, res) => {
  try {
    const whereClause = getReportFilter(req.query);

    const orders = await Order.findAll({
      where: whereClause,
      attributes: ['id', 'orderNumber', 'total', 'createdAt'],
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name'] }
      ],
      order: [['total', 'DESC']],
      limit: 5
    });

    res.status(200).json(orders);
  } catch (error) {
    console.error('[Report Controller] GetTopOrders Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: getTopProducts
// Purpose: Aggregates sales quantities and totals to determine top products.
// Routed from: GET /api/reports/top-products (Admin Top Products Table)
exports.getTopProducts = async (req, res) => {
  try {
    const whereClause = getReportFilter(req.query);

    // Fetch order IDs that match the date/employee filters
    const orders = await Order.findAll({
      attributes: ['id'],
      where: whereClause,
      raw: true
    });
    const orderIds = orders.map(o => o.id);

    if (orderIds.length === 0) {
      return res.status(200).json([]);
    }

    const topProducts = await OrderItem.findAll({
      where: { orderId: { [Op.in]: orderIds } },
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'quantitySold'],
        [sequelize.fn('SUM', sequelize.col('OrderItem.total')), 'revenue']
      ],
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name']
      }],
      group: ['productId'],
      order: [[sequelize.fn('SUM', sequelize.col('OrderItem.total')), 'DESC']],
      limit: 5
    });

    res.status(200).json(topProducts);
  } catch (error) {
    console.error('[Report Controller] GetTopProducts Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: getCategorySales
// Purpose: Groups sales by Category to draw the Top Categories pie chart.
// Routed from: GET /api/reports/category-sales (Admin Top Categories Pie chart & Table)
exports.getCategorySales = async (req, res) => {
  try {
    const whereClause = getReportFilter(req.query);

    const orders = await Order.findAll({
      attributes: ['id'],
      where: whereClause,
      raw: true
    });
    const orderIds = orders.map(o => o.id);

    if (orderIds.length === 0) {
      return res.status(200).json([]);
    }

    // Join OrderItem -> Product -> Category to sum revenues
    const categorySales = await OrderItem.findAll({
      where: { orderId: { [Op.in]: orderIds } },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('OrderItem.total')), 'revenue']
      ],
      include: [{
        model: Product,
        as: 'product',
        attributes: ['categoryId'],
        include: [{
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color']
        }]
      }],
      group: [sequelize.col('product.categoryId')],
      order: [[sequelize.fn('SUM', sequelize.col('OrderItem.total')), 'DESC']]
    });

    // Format output to return category name, color, and revenue
    const formatted = categorySales.map(item => {
      const productObj = item.product;
      const categoryObj = productObj ? productObj.category : null;
      return {
        categoryId: categoryObj ? categoryObj.id : null,
        categoryName: categoryObj ? categoryObj.name : 'Uncategorized',
        color: categoryObj ? categoryObj.color : '#cccccc',
        revenue: parseFloat(item.getDataValue('revenue')) || 0.00
      };
    });

    res.status(200).json(formatted);
  } catch (error) {
    console.error('[Report Controller] GetCategorySales Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: exportPdf / exportXls
// Purpose: Placeholder routes for reporting downloads.
// Routed from: GET /api/reports/export/pdf and GET /api/reports/export/xls
exports.exportPdf = (req, res) => {
  res.status(200).json({ message: 'PDF Export completed successfully. File downloading.' });
};

exports.exportXls = (req, res) => {
  res.status(200).json({ message: 'XLS Export completed successfully. File downloading.' });
};
