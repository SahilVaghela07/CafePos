// =========================================================================
// ORDER CONTROLLER
// Purpose: Core POS transactional logic (cart math, promotions, payments, KDS states).
// Used in: backend/src/routes/orderRoutes.js
// =========================================================================

const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Table = require('../models/Table');
const Customer = require('../models/Customer');
const Promotion = require('../models/Promotion');
const { broadcastKdsUpdate } = require('../services/websocketService');

// Helper: Calculate Cart totals and apply promotions
// Purpose: Reusable function that performs the pricing calculations, applying product-level auto-promotions,
// order-level auto-promotions, manual coupon codes, and tax rates.
const calculateCart = async (items, couponCode = null) => {
  let subtotal = 0.00;
  let productDiscountsTotal = 0.00;
  let orderDiscountsTotal = 0.00;
  let orderTax = 0.00;
  const processedItems = [];

  // 1. Process each item in the cart to check product-level pricing, tax, and auto-promos
  for (const item of items) {
    const product = await Product.findByPk(item.productId, {
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'color'] }]
    });
    if (!product) {
      throw new Error(`Product ID ${item.productId} not found`);
    }

    const price = parseFloat(product.price);
    const quantity = parseInt(item.quantity, 10);
    const lineSubtotal = price * quantity;
    let lineDiscount = 0.00;

    // Check for active Automated Product-Level Promotions on this product
    // e.g. Buy minimum Qty of 3 to get discount
    const productPromo = await Promotion.findOne({
      where: {
        type: 'Automated',
        applyOn: 'Product',
        productId: product.id,
        isActive: true
      }
    });

    if (productPromo && quantity >= productPromo.minQuantity) {
      if (productPromo.discountType === 'Percentage') {
        lineDiscount = lineSubtotal * (parseFloat(productPromo.discountValue) / 100);
      } else {
        // Fixed amount discount off the line
        lineDiscount = parseFloat(productPromo.discountValue);
      }
      // Cap discount at subtotal to prevent negative prices
      if (lineDiscount > lineSubtotal) lineDiscount = lineSubtotal;
    }

    const lineTotal = lineSubtotal - lineDiscount;
    // Calculate line tax based on product tax percentage (calculated after product-level discount)
    const taxRate = parseFloat(product.tax) / 100;
    const lineTax = lineTotal * taxRate;

    subtotal += lineSubtotal;
    productDiscountsTotal += lineDiscount;
    orderTax += lineTax;

    processedItems.push({
      productId: product.id,
      name: product.name,
      quantity,
      price,
      discountAmount: lineDiscount,
      total: lineTotal,
      uom: product.uom,
      category: product.category
    });
  }

  // 2. Process Order-Level Discounts on the running total
  const runningTotal = subtotal - productDiscountsTotal;

  // Check for active Automated Order-Level Promotions
  // e.g. Spent >= Minimum Order Amount
  const orderPromo = await Promotion.findOne({
    where: {
      type: 'Automated',
      applyOn: 'Order',
      isActive: true
    }
  });

  let orderPromoDiscount = 0.00;
  if (orderPromo && runningTotal >= parseFloat(orderPromo.minOrderAmount)) {
    if (orderPromo.discountType === 'Percentage') {
      orderPromoDiscount = runningTotal * (parseFloat(orderPromo.discountValue) / 100);
    } else {
      orderPromoDiscount = parseFloat(orderPromo.discountValue);
    }
  }

  // Check for manually entered Coupon Code if provided
  let couponDiscount = 0.00;
  if (couponCode) {
    const coupon = await Promotion.findOne({
      where: {
        code: couponCode.toUpperCase(),
        type: 'Coupon',
        isActive: true
      }
    });

    if (coupon) {
      if (coupon.discountType === 'Percentage') {
        couponDiscount = runningTotal * (parseFloat(coupon.discountValue) / 100);
      } else {
        couponDiscount = parseFloat(coupon.discountValue);
      }
    }
  }

  orderDiscountsTotal = orderPromoDiscount + couponDiscount;
  if (orderDiscountsTotal > runningTotal) {
    orderDiscountsTotal = runningTotal; // Cap to prevent negative final total
  }

  const finalTotal = runningTotal - orderDiscountsTotal + orderTax;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    productDiscounts: parseFloat(productDiscountsTotal.toFixed(2)),
    orderDiscounts: parseFloat(orderDiscountsTotal.toFixed(2)),
    totalDiscounts: parseFloat((productDiscountsTotal + orderDiscountsTotal).toFixed(2)),
    tax: parseFloat(orderTax.toFixed(2)),
    total: parseFloat(finalTotal.toFixed(2)),
    items: processedItems
  };
};

// Handler: getOrders
// Purpose: Lists all orders for the current POS session.
// Routed from: GET /api/orders (POS order history sidebar list)
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name'] },
        { model: Table, as: 'table', attributes: ['id', 'tableNumber'] }
      ],
      order: [['id', 'DESC']]
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error('[Order Controller] GetOrders Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: getOrderDetails
// Purpose: Retrieves specific order information and all line items for rendering.
// Routed from: GET /api/orders/:id (Clicking an order in POS list opens Detail modal)
exports.getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Table, as: 'table' },
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'color'] }]
          }]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('[Order Controller] GetOrderDetails Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: createOrder
// Purpose: Creates a new order ticket in 'Draft' state, calculates pricing, and locks in products.
// Routed from: POST /api/orders (Adding products to table and clicking Save or Send to Kitchen)
exports.createOrder = async (req, res) => {
  try {
    const { tableId, customerId, items, couponCode } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Cannot create empty order' });
    }

    // 1. Calculate pricing details
    const cart = await calculateCart(items, couponCode);

    // 2. Generate a unique human-readable Order Number (e.g. #2206 based on incremental sequence)
    const lastOrder = await Order.findOne({ order: [['id', 'DESC']] });
    const nextSequence = lastOrder ? lastOrder.id + 2200 : 2201; // Start at #2201 sequence
    const orderNumber = `#${nextSequence}`;

    // 3. Create main Order record in database
    const order = await Order.create({
      orderNumber,
      status: 'Draft',
      subtotal: cart.subtotal,
      tax: cart.tax,
      discountAmount: cart.totalDiscounts,
      total: cart.total,
      tableId,
      customerId,
      userId: req.user.id, // Logged in cashier creator
      kdsStatus: 'To Cook'
    });

    // 4. Create OrderItem line records linked to the order
    for (const item of cart.items) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        discountAmount: item.discountAmount,
        total: item.total
      });
    }

    // 5. Broadcast to KDS via WebSockets that a new order has been sent to kitchen
    broadcastKdsUpdate({ event: 'ORDER_CREATED', orderId: order.id, orderNumber: order.orderNumber });

    res.status(201).json({
      message: 'Order created successfully',
      orderId: order.id,
      orderNumber: order.orderNumber,
      cart
    });
  } catch (error) {
    console.error('[Order Controller] CreateOrder Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

// Handler: updateOrder
// Purpose: Allows editing a Draft order cart (adjusting quantities, applying coupons) before payment.
// Routed from: PUT /api/orders/:id (Edit Draft Order redirection)
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, couponCode, tableId, customerId } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Security Check: POS only allows editing orders in "Draft" state. Paid is view-only.
    if (order.status !== 'Draft') {
      return res.status(400).json({ message: 'Only Draft orders can be modified' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Cannot save empty items list' });
    }

    // 1. Recalculate cart totals
    const cart = await calculateCart(items, couponCode);

    // 2. Update order headers
    order.subtotal = cart.subtotal;
    order.tax = cart.tax;
    order.discountAmount = cart.totalDiscounts;
    order.total = cart.total;
    if (tableId) order.tableId = tableId;
    if (customerId !== undefined) order.customerId = customerId;
    await order.save();

    // 3. Delete existing items and overwrite with fresh line records
    await OrderItem.destroy({ where: { orderId: id } });
    for (const item of cart.items) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        discountAmount: item.discountAmount,
        total: item.total
      });
    }

    // 4. Broadcast KDS update
    broadcastKdsUpdate({ event: 'ORDER_UPDATED', orderId: order.id, orderNumber: order.orderNumber });

    res.status(200).json({
      message: 'Order updated successfully',
      orderId: order.id,
      cart
    });
  } catch (error) {
    console.error('[Order Controller] UpdateOrder Error:', error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

// Handler: processPayment
// Purpose: Handles checkout payment processing, setting status to 'Paid', capturing payment details.
// Routed from: POST /api/orders/:id/payment (Numpad pay click)
exports.processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentReference } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'Draft') {
      return res.status(400).json({ message: 'Order has already been paid or cancelled' });
    }

    // Lock payment details and mark Paid
    order.status = 'Paid';
    order.paymentMethod = paymentMethod;
    order.paymentReference = paymentReference || null;
    await order.save();

    // Broadcast update to KDS to clear ticket or show status
    broadcastKdsUpdate({ event: 'ORDER_PAID', orderId: order.id, orderNumber: order.orderNumber });

    res.status(200).json({
      message: 'Payment processed successfully. Order completed.',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        paymentMethod: order.paymentMethod
      }
    });
  } catch (error) {
    console.error('[Order Controller] ProcessPayment Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ==========================================
// KDS (KITCHEN DISPLAY SYSTEM) ACTIONS
// ==========================================

// Handler: updateKdsStatus
// Purpose: Moves the entire order ticket to the next KDS stage (To Cook -> Preparing -> Completed).
// Routed from: PUT /api/orders/:id/kds-status (Kitchen staff clicks a ticket card)
exports.updateKdsStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'To Cook', 'Preparing', 'Completed'

    if (!status || !['To Cook', 'Preparing', 'Completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid KDS stage status' });
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.kdsStatus = status;
    await order.save();

    // Broadcast event to WebSocket subscribers (sync POS terminal alert and KDS screens)
    broadcastKdsUpdate({
      event: 'KDS_STATUS_CHANGED',
      orderId: order.id,
      orderNumber: order.orderNumber,
      kdsStatus: order.kdsStatus
    });

    res.status(200).json({
      message: 'KDS stage updated',
      kdsStatus: order.kdsStatus
    });
  } catch (error) {
    console.error('[Order Controller] UpdateKdsStatus Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: toggleKdsItemStrikethrough
// Purpose: Striking through / marking individual items within a kitchen ticket card as prepared.
// Routed from: PUT /api/orders/items/:itemId/kds-complete (Kitchen clicks product item)
exports.toggleKdsItemStrikethrough = async (req, res) => {
  try {
    const { itemId } = req.params;

    const orderItem = await OrderItem.findByPk(itemId);
    if (!orderItem) {
      return res.status(404).json({ message: 'Order item not found' });
    }

    // Toggle the completed boolean
    orderItem.isCompletedInKds = !orderItem.isCompletedInKds;
    await orderItem.save();

    // Broadcast the strikethrough state in real-time
    broadcastKdsUpdate({
      event: 'KDS_ITEM_TOGGLED',
      orderId: orderItem.orderId,
      itemId: orderItem.id,
      isCompletedInKds: orderItem.isCompletedInKds
    });

    res.status(200).json({
      message: 'Order item strikethrough status updated',
      isCompletedInKds: orderItem.isCompletedInKds
    });
  } catch (error) {
    console.error('[Order Controller] ToggleKdsItemStrikethrough Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
