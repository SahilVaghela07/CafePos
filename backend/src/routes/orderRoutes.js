// =========================================================================
// ORDER TRANSACTIONAL ROUTING
// Purpose: Declares endpoints for ordering lifecycle, numpad checkout, and KDS updates.
// Used in: backend/src/server.js to register order routing.
// =========================================================================

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// Apply protection middleware to all routes (requires cashier/admin session)
router.use(protect);

// Route: Get all orders in current session
// Method: GET /api/orders
router.get('/', orderController.getOrders);

// Route: Get detailed order items list
// Method: GET /api/orders/:id
router.get('/:id', orderController.getOrderDetails);

// Route: Save or Send new order to kitchen (starts as Draft and sets kdsStatus to To Cook)
// Method: POST /api/orders
router.post('/', orderController.createOrder);

// Route: Update items in a Draft order cart
// Method: PUT /api/orders/:id
router.put('/:id', orderController.updateOrder);

// Route: Pay and close draft order ticket
// Method: POST /api/orders/:id/payment
router.post('/:id/payment', orderController.processPayment);

// Route: Update entire order KDS state stage (To Cook -> Preparing -> Completed)
// Method: PUT /api/orders/:id/kds-status
router.put('/:id/kds-status', orderController.updateKdsStatus);

// Route: Toggle strikethrough on individual item inside a kitchen card
// Method: PUT /api/orders/items/:itemId/kds-complete
router.put('/items/:itemId/kds-complete', orderController.toggleKdsItemStrikethrough);

// Route: Email customer receipt for a paid order
// Method: POST /api/orders/:id/email-receipt
router.post('/:id/email-receipt', orderController.emailReceipt);

module.exports = router;
