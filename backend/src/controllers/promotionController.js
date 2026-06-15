// =========================================================================
// COUPONS & PROMOTIONS CONTROLLER
// Purpose: Handles CRUD logic for marketing campaigns (manual coupons & automated rules).
// Used in: backend/src/routes/promotionRoutes.js
// =========================================================================

const Promotion = require('../models/Promotion');
const Product = require('../models/Product');

// Handler: getPromotions
// Purpose: Lists all coupon codes and automated promotions.
// Routed from: GET /api/promotions (Admin promotions dashboard listing)
exports.getPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.findAll({
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price']
      }],
      order: [['id', 'DESC']]
    });
    res.status(200).json(promotions);
  } catch (error) {
    console.error('[Promotion Controller] GetPromotions Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: createPromotion
// Purpose: Adds a new coupon code or automated promotion rule.
// Routed from: POST /api/promotions (Admin Promotion configuration form)
exports.createPromotion = async (req, res) => {
  try {
    const { 
      name, type, code, applyOn, productId, 
      minQuantity, minOrderAmount, discountType, discountValue, isActive 
    } = req.body;

    if (!name || !type || !discountType || discountValue === undefined) {
      return res.status(400).json({ message: 'Name, type, discountType and discountValue are required' });
    }

    // Validation: if it is a manual Coupon, a unique coupon code is required
    if (type === 'Coupon') {
      if (!code) return res.status(400).json({ message: 'Coupon code is required for Coupon type' });
      const codeExists = await Promotion.findOne({ where: { code } });
      if (codeExists) return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const promotion = await Promotion.create({
      name,
      type,
      code: type === 'Coupon' ? code.toUpperCase() : null, // Store coupon codes in uppercase
      applyOn: type === 'Coupon' ? 'Order' : applyOn, // Manual coupons apply to the whole order total in this spec
      productId: applyOn === 'Product' ? productId : null,
      minQuantity: applyOn === 'Product' ? (minQuantity || 1) : null,
      minOrderAmount: applyOn === 'Order' ? (minOrderAmount || 0.00) : null,
      discountType,
      discountValue,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      message: 'Promotion created successfully',
      promotion
    });
  } catch (error) {
    console.error('[Promotion Controller] CreatePromotion Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: updatePromotion
// Purpose: Modifies promotion rules or toggles active status.
// Routed from: PUT /api/promotions/:id
exports.updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, code, productId, minQuantity, 
      minOrderAmount, discountType, discountValue, isActive 
    } = req.body;

    const promotion = await Promotion.findByPk(id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    if (name) promotion.name = name;
    if (isActive !== undefined) promotion.isActive = isActive;
    if (discountType) promotion.discountType = discountType;
    if (discountValue !== undefined) promotion.discountValue = discountValue;

    if (promotion.type === 'Coupon' && code) {
      const codeExists = await Promotion.findOne({ where: { code } });
      if (codeExists && codeExists.id !== promotion.id) {
        return res.status(400).json({ message: 'Coupon code already taken' });
      }
      promotion.code = code.toUpperCase();
    }

    if (promotion.type === 'Automated') {
      if (productId !== undefined) promotion.productId = productId;
      if (minQuantity !== undefined) promotion.minQuantity = minQuantity;
      if (minOrderAmount !== undefined) promotion.minOrderAmount = minOrderAmount;
    }

    await promotion.save();
    res.status(200).json({
      message: 'Promotion updated successfully',
      promotion
    });
  } catch (error) {
    console.error('[Promotion Controller] UpdatePromotion Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: deletePromotion
// Purpose: Permanently removes a promotion rule.
// Routed from: DELETE /api/promotions/:id
exports.deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findByPk(id);
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    await promotion.destroy();
    res.status(200).json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('[Promotion Controller] DeletePromotion Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: validateCoupon
// Purpose: Looks up a manual coupon code entered by a Cashier at checkout to check validity.
// Routed from: POST /api/promotions/validate-coupon (POS coupon dialog popup)
exports.validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const coupon = await Promotion.findOne({
      where: {
        code: code.toUpperCase(),
        type: 'Coupon',
        isActive: true
      }
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid or expired coupon code' });
    }

    res.status(200).json({
      message: 'Coupon is valid',
      coupon: {
        id: coupon.id,
        name: coupon.name,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      }
    });
  } catch (error) {
    console.error('[Promotion Controller] ValidateCoupon Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
