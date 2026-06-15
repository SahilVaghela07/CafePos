// =========================================================================
// REPORTING & ANALYTICS ROUTING
// Purpose: Declares endpoints for fetching sales reports, trends, and dashboard insights.
// Used in: backend/src/server.js to register report routing.
// =========================================================================

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Apply protection middleware to all reporting routes
// Purpose: Ensures only logged-in Admin accounts can retrieve business sales intelligence.
router.use(protect);
router.use(adminOnly);

// Route: Get dashboard stats (Total orders, Revenue, AOV)
// Method: GET /api/reports/summary
router.get('/summary', reportController.getDashboardSummary);

// Route: Get line-chart trends data
// Method: GET /api/reports/sales-trend
router.get('/sales-trend', reportController.getSalesTrend);

// Route: Get highest value transactions list
// Method: GET /api/reports/top-orders
router.get('/top-orders', reportController.getTopOrders);

// Route: Get top selling products list
// Method: GET /api/reports/top-products
router.get('/top-products', reportController.getTopProducts);

// Route: Get pie-chart category split
// Method: GET /api/reports/category-sales
router.get('/category-sales', reportController.getCategorySales);

// Route: Export documents
// Method: GET /api/reports/export/pdf
router.get('/export/pdf', reportController.exportPdf);

// Method: GET /api/reports/export/xls
router.get('/export/xls', reportController.exportXls);

module.exports = router;
