// =========================================================================
// PRODUCT ROUTING
// Purpose: Declares endpoints for product menu items management.
// Used in: backend/src/server.js to register product routing.
// =========================================================================

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Route: Get all products (accessible by any logged-in Cashier/Admin to display catalog)
// Method: GET /api/products
router.get('/', protect, productController.getProducts);

// Route: Admin Product Operations (restricted to Admin users only)
// Method: POST /api/products (Create product, supports on-the-fly category)
router.post('/', protect, adminOnly, productController.createProduct);

// Method: PUT /api/products/:id (Update product fields)
router.put('/:id', protect, adminOnly, productController.updateProduct);

// Method: DELETE /api/products/:id (Delete product)
router.delete('/:id', protect, adminOnly, productController.deleteProduct);

module.exports = router;
