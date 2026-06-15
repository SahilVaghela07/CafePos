// =========================================================================
// CATEGORY ROUTING
// Purpose: Declares endpoints for listing, creating, and modifying product categories.
// Used in: backend/src/server.js to register category routing.
// =========================================================================

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Route: Get all categories (accessible by any logged-in Cashier/Admin)
// Method: GET /api/categories
router.get('/', protect, categoryController.getCategories);

// Route: Admin Category Operations (restricted to Admin users only)
// Method: POST /api/categories (Create)
router.post('/', protect, adminOnly, categoryController.createCategory);

// Method: PUT /api/categories/:id (Update name/color)
router.put('/:id', protect, adminOnly, categoryController.updateCategory);

// Method: DELETE /api/categories/:id (Delete)
router.delete('/:id', protect, adminOnly, categoryController.deleteCategory);

module.exports = router;
