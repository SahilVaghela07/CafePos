// =========================================================================
// COUPONS & PROMOTIONS ROUTING
// Purpose: Declares endpoints for configuring discounts and validating coupons.
// Used in: backend/src/server.js to register promotion routing.
// =========================================================================

const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Route: Get all promotions (accessible by cashiers/admins to review rules)
// Method: GET /api/promotions
router.get('/', protect, promotionController.getPromotions);

// Route: Validate manual coupon code at POS checkout (accessible by logged-in Cashiers)
// Method: POST /api/promotions/validate-coupon
router.post('/validate-coupon', protect, promotionController.validateCoupon);

// Route: Admin Promotion Operations (restricted to Admin roles only)
// Method: POST /api/promotions (Create rule/coupon)
router.post('/', protect, adminOnly, promotionController.createPromotion);

// Method: PUT /api/promotions/:id (Edit rule/coupon)
router.put('/:id', protect, adminOnly, promotionController.updatePromotion);

// Method: DELETE /api/promotions/:id (Delete rule/coupon)
router.delete('/:id', protect, adminOnly, promotionController.deletePromotion);

module.exports = router;
