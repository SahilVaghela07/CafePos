// =========================================================================
// CUSTOMER MANAGEMENT ROUTING
// Purpose: Declares endpoints for customer lookup and profiling.
// Used in: backend/src/server.js to register customer routing.
// =========================================================================

const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Apply protect middleware to all routes (requires valid user login)
router.use(protect);

// Route: Get customer list (supports search lookup using query, e.g. /api/customers?search=john)
// Method: GET /api/customers
router.get('/', customerController.getCustomers);

// Route: Create customer profile
// Method: POST /api/customers
router.post('/', customerController.createCustomer);

// Route: Edit customer profile
// Method: PUT /api/customers/:id
router.put('/:id', customerController.updateCustomer);

// Route: Delete customer profile (restricted to Admins only)
// Method: DELETE /api/customers/:id
router.delete('/:id', adminOnly, customerController.deleteCustomer);

module.exports = router;
