// =========================================================================
// POS ORDER TERMINAL VIEW
// Purpose: Primary screen for cashier operations: selecting tables, taking orders,
//          applying coupons, sending to kitchen, and processing payments.
// Used in: frontend/src/App.jsx
// =========================================================================

import React, { useState, useEffect } from 'react';
import { 
  Layers, ShoppingBag, CreditCard, ChevronRight, Search, 
  Plus, Minus, Tag, Send, Check, Mail, Printer, RefreshCw, X 
} from 'lucide-react';
import api from '../services/api';

const PosTerminalView = ({ user, onLogout, editingOrder, clearEditingOrder }) => {
  // POS Catalogs
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Layout State
  const [floors, setFloors] = useState([]);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showTablePopup, setShowTablePopup] = useState(true); // Default to floor plan selector on load
  const [occupiedTables, setOccupiedTables] = useState(new Set()); // IDs of tables with active draft orders

  // Cart & Order State
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [cartItems, setCartItems] = useState([]); // Array of { product, quantity }
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState(null);
  
  // Cart Summary Math (calculated locally for instant UI response, validated/overwritten by backend API)
  const [summary, setSummary] = useState({ subtotal: 0, discounts: 0, tax: 0, total: 0 });

  // Payment Numpad State
  const [selectedPayment, setSelectedPayment] = useState('Cash'); // Cash, Card, UPI
  const [amountPaid, setAmountPaid] = useState(''); // Text entered via Numpad
  const [changeDue, setChangeDue] = useState(0);
  const [cardRef, setCardRef] = useState('');

  // Modals & UI States
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentScreen, setShowPaymentScreen] = useState(false);
  const [lastPaidOrder, setLastPaidOrder] = useState(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [uiError, setUiError] = useState('');
  const [uiSuccess, setUiSuccess] = useState('');

  // 1. Initial Load: Fetch catalog items and layouts
  useEffect(() => {
    fetchPOSData();
  }, []);

  // Automatically load draft order and open checkout if redirected from OrdersHistoryView
  useEffect(() => {
    if (editingOrder) {
      loadRedirectOrder(editingOrder);
    }
  }, [editingOrder]);

  const loadRedirectOrder = async (order) => {
    try {
      // Select the table
      setSelectedTable(order.table || { id: order.tableId, tableNumber: `Table ${order.tableId}` });
      setShowTablePopup(false);
      
      // Set active draft order details
      setCurrentOrderId(order.id);
      
      // Map order items to local cart structure
      const mappedItems = order.items.map(item => ({
        product: item.product,
        quantity: item.quantity
      }));
      setCartItems(mappedItems);
      
      // Reset payment fields
      setAmountPaid('');
      setCardRef('');
      
      // Automatically open checkout screen!
      setShowPaymentScreen(true);
      
      // Clear the editing flag in parent component to prevent re-execution
      if (clearEditingOrder) {
        clearEditingOrder();
      }
      
      console.log('[POS Edit Redirect] Loaded draft order #', order.orderNumber, 'and opened checkout.');
    } catch (err) {
      console.error('Failed to load redirect editing order:', err);
    }
  };

  const fetchPOSData = async () => {
    try {
      const cats = await api.categories.getCategories();
      const prods = await api.products.getProducts();
      const floorList = await api.tables.getFloors();
      const orders = await api.orders.getOrders();

      setCategories(cats);
      setProducts(prods);
      setFloors(floorList);

      // Identify which tables have active "Draft" orders in the current session
      const drafts = new Set(
        orders.filter(o => o.status === 'Draft' && o.tableId).map(o => o.tableId)
      );
      setOccupiedTables(drafts);
    } catch (err) {
      setUiError('Failed to load POS catalog data.');
    }
  };

  // 2. Floor Plan Table Selection Logic
  const handleSelectTable = async (table) => {
    setSelectedTable(table);
    setShowTablePopup(false);
    setCartItems([]);
    setCurrentOrderId(null);
    setActiveCoupon(null);
    setCouponCode('');
    setAmountPaid('');
    setCardRef('');
    setShowPaymentScreen(false);

    try {
      // Check if this table has an existing active "Draft" order to restore
      const orders = await api.orders.getOrders();
      const existingDraft = orders.find(o => o.tableId === table.id && o.status === 'Draft');

      if (existingDraft) {
        // Retrieve full order details including items from API
        const details = await api.orders.getOrderDetails(existingDraft.id);
        setCurrentOrderId(details.id);
        
        // Map backend order items back to local cart structure
        const mappedItems = details.items.map(item => ({
          product: item.product,
          quantity: item.quantity
        }));
        setCartItems(mappedItems);
        
        // If a coupon code was saved, reload it
        // Note: Coupon code is not stored at root Order model but we can recompute
        console.log('[POS Restore] Restored draft order #', details.orderNumber);
      }
    } catch (err) {
      console.error('Error restoring draft table order:', err);
    }
  };

  // 3. Cart Operations
  const handleAddToCart = (product) => {
    if (!selectedTable) {
      setUiError('Please select a dining table first.');
      setShowTablePopup(true);
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  const handleUpdateQuantity = (productId, delta) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  // 4. Cart Totals & Promotions calculation loop (synchronizes with controller logic)
  useEffect(() => {
    if (cartItems.length === 0) {
      setSummary({ subtotal: 0, discounts: 0, tax: 0, total: 0 });
      return;
    }
    recalculateCartTotals();
  }, [cartItems, activeCoupon]);

  const recalculateCartTotals = () => {
    let subtotal = 0;
    let productDiscounts = 0;
    let orderTax = 0;

    cartItems.forEach(item => {
      const price = parseFloat(item.product.price);
      const qty = item.quantity;
      const lineSubtotal = price * qty;
      let lineDiscount = 0;

      // Note: Product-level auto-promotions lookup (simulated in frontend for reactive UI)
      // Check if product contains promo rule (mocked)
      // We will rely on backend for absolute accuracy, but locally compute for instant display
      subtotal += lineSubtotal;
      
      const taxRate = parseFloat(item.product.tax) / 100;
      orderTax += (lineSubtotal - lineDiscount) * taxRate;
    });

    let runningTotal = subtotal - productDiscounts;
    let couponDiscount = 0;

    // Apply Coupon Code if active
    if (activeCoupon) {
      if (activeCoupon.discountType === 'Percentage') {
        couponDiscount = runningTotal * (parseFloat(activeCoupon.discountValue) / 100);
      } else {
        couponDiscount = parseFloat(activeCoupon.discountValue);
      }
    }

    if (couponDiscount > runningTotal) couponDiscount = runningTotal;
    const finalTotal = runningTotal - couponDiscount + orderTax;

    setSummary({
      subtotal: parseFloat(subtotal.toFixed(2)),
      discounts: parseFloat((productDiscounts + couponDiscount).toFixed(2)),
      tax: parseFloat(orderTax.toFixed(2)),
      total: parseFloat(finalTotal.toFixed(2))
    });
  };

  // 5. Apply Coupon Code Logic
  const handleRedeemCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await api.promotions.validateCoupon(couponCode);
      setActiveCoupon(res.coupon);
      setUiSuccess(`Coupon ${res.coupon.code} applied!`);
      setShowCouponModal(false);
    } catch (err) {
      setUiError(err.message || 'Invalid coupon code');
    }
  };

  // 6. Send to Kitchen (KDS) Logic
  const handleSendToKitchen = async () => {
    if (!selectedTable || cartItems.length === 0) return;
    setUiError('');
    setUiSuccess('');

    // Prepare API body items list
    const itemsPayload = cartItems.map(item => ({
      productId: item.product.id,
      quantity: item.quantity
    }));

    try {
      let res;
      if (currentOrderId) {
        // Update existing Draft order
        res = await api.orders.updateOrder(currentOrderId, {
          tableId: selectedTable.id,
          items: itemsPayload,
          couponCode: activeCoupon ? activeCoupon.code : null
        });
        setUiSuccess('Order updated and sent to Kitchen!');
      } else {
        // Create new order
        res = await api.orders.createOrder({
          tableId: selectedTable.id,
          items: itemsPayload,
          couponCode: activeCoupon ? activeCoupon.code : null
        });
        setCurrentOrderId(res.orderId);
        setUiSuccess(`Order ${res.orderNumber} sent to Kitchen!`);
      }
      fetchPOSData(); // Reload floor plan states
    } catch (err) {
      setUiError(err.message || 'Failed to send order to kitchen');
    }
  };

  // 7. NumPad Checkout Actions
  const handleNumPress = (val) => {
    if (val === 'C') {
      setAmountPaid('');
    } else if (val === '←') {
      setAmountPaid(prev => prev.slice(0, -1));
    } else {
      setAmountPaid(prev => prev + val);
    }
  };

  // Calculate change due in real time on cash payment
  useEffect(() => {
    if (selectedPayment === 'Cash' && amountPaid) {
      const paid = parseFloat(amountPaid);
      const due = paid - summary.total;
      setChangeDue(due > 0 ? parseFloat(due.toFixed(2)) : 0);
    } else {
      setChangeDue(0);
    }
  }, [amountPaid, summary.total, selectedPayment]);

  const handleConfirmPayment = async () => {
    if (!currentOrderId) {
      // Automatically send to KDS first if not yet done
      await handleSendToKitchen();
    }

    if (!currentOrderId) return;
    setUiError('');

    // Validation
    if (selectedPayment === 'Cash') {
      const paid = parseFloat(amountPaid || 0);
      if (paid < summary.total) {
        setUiError('Insufficient cash amount entered.');
        return;
      }
    } else if (selectedPayment === 'Card' && !cardRef) {
      setUiError('Transaction reference number is required for Card payments.');
      return;
    }

    try {
      const res = await api.orders.processPayment(currentOrderId, {
        paymentMethod: selectedPayment,
        paymentReference: selectedPayment === 'Card' ? cardRef : (selectedPayment === 'UPI' ? 'UPI_SCAN' : null)
      });

      // Prepare receipt modal
      const details = await api.orders.getOrderDetails(currentOrderId);
      setLastPaidOrder(details);
      setShowReceiptModal(true);

      // Reset cart and active states
      setSelectedTable(null);
      setCartItems([]);
      setCurrentOrderId(null);
      setActiveCoupon(null);
      setCouponCode('');
      setAmountPaid('');
      setCardRef('');
      setShowPaymentScreen(false);
      setShowTablePopup(true); // Open table pop-up to take next order
      fetchPOSData(); // Sync active tables state
    } catch (err) {
      setUiError(err.message || 'Payment processing failed.');
    }
  };

  // 8. Filter products list
  const filteredProducts = products.filter(prod => {
    const matchesCategory = activeCategory === 'All' || prod.categoryId === activeCategory;
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={styles.container}>
      {/* Dynamic Alerts */}
      {uiError && <div style={styles.errorBanner} onClick={() => setUiError('')}>{uiError} <X size={16} /></div>}
      {uiSuccess && <div style={styles.successBanner} onClick={() => setUiSuccess('')}>{uiSuccess} <X size={16} /></div>}

      {/* POS Top Navigation Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>odoo</div>
          <button style={styles.tableSelectorBtn} onClick={() => setShowTablePopup(true)}>
            <Layers size={16} />
            <span>{selectedTable ? `${selectedTable.tableNumber} (${selectedTable.seats} Seats)` : 'Select Table'}</span>
          </button>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.employeeInfo}>
            <span style={styles.empDot}></span>
            <span>{user.name} ({user.role})</span>
          </div>
        </div>
      </header>

      {/* Primary POS Grid */}
      <div className="pos-main-grid">
        
        {/* ==========================================
            1. PRODUCTS SECTION (LEFT PANEL)
           ========================================== */}
        <section className="pos-product-section">
          <div style={styles.searchBarWrapper}>
            <Search size={18} style={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search products by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Category Tabs */}
          <div style={styles.categoryTabs}>
            <button 
              style={{...styles.catTab, ...(activeCategory === 'All' ? styles.catTabActive : {})}}
              onClick={() => setActiveCategory('All')}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                style={{
                  ...styles.catTab, 
                  ...(activeCategory === cat.id ? { backgroundColor: cat.color, color: '#ffffff' } : {})
                }}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div style={styles.productGrid}>
            {filteredProducts.map(prod => {
              const catObj = categories.find(c => c.id === prod.categoryId);
              const cardColor = catObj ? catObj.color : 'var(--border-color)';
              
              return (
                <div 
                  key={prod.id} 
                  style={{...styles.productCard, borderTop: `4px solid ${cardColor}`}}
                  onClick={() => handleAddToCart(prod)}
                >
                  <h3 style={styles.productName}>{prod.name}</h3>
                  <div style={styles.productCardFooter}>
                    <span style={styles.productUom}>{prod.uom}</span>
                    <span style={styles.productPrice}>${parseFloat(prod.price).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ==========================================
            2. CART SECTION (CENTER PANEL)
           ========================================== */}
        <section className="pos-cart-section">
          <div style={styles.cartHeader}>
            <ShoppingBag size={20} />
            <h2>Order Cart</h2>
            {selectedTable && <span style={styles.cartTableName}>{selectedTable.tableNumber}</span>}
          </div>

          <div style={styles.cartList}>
            {cartItems.length === 0 ? (
              <div style={styles.emptyCart}>
                <ShoppingBag size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
                <p>Cart is empty. Select products to add.</p>
              </div>
            ) : (
              cartItems.map(item => (
                <div key={item.product.id} style={styles.cartItemRow}>
                  <div style={styles.cartItemInfo}>
                    <span style={styles.cartItemName}>{item.product.name}</span>
                    <span style={styles.cartItemPrice}>${parseFloat(item.product.price).toFixed(2)}</span>
                  </div>
                  <div style={styles.cartItemActions}>
                    <button style={styles.qtyBtn} onClick={() => handleUpdateQuantity(item.product.id, -1)}>
                      <Minus size={14} />
                    </button>
                    <span style={styles.qtyText}>{item.quantity}</span>
                    <button style={styles.qtyBtn} onClick={() => handleUpdateQuantity(item.product.id, 1)}>
                      <Plus size={14} />
                    </button>
                    <span style={styles.lineTotal}>
                      ${(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary */}
          <div style={styles.cartSummary}>
            <div style={styles.summaryRow}>
              <span>Subtotal</span>
              <span>${summary.subtotal.toFixed(2)}</span>
            </div>
            {summary.discounts > 0 && (
              <div style={{...styles.summaryRow, color: 'var(--color-success-light)'}}>
                <span>Discounts {activeCoupon && `(${activeCoupon.code})`}</span>
                <span>-${summary.discounts.toFixed(2)}</span>
              </div>
            )}
            <div style={styles.summaryRow}>
              <span>Tax (5%)</span>
              <span>${summary.tax.toFixed(2)}</span>
            </div>
            <div style={{...styles.summaryRow, ...styles.totalRow}}>
              <span>Total Amount</span>
              <span>${summary.total.toFixed(2)}</span>
            </div>
          </div>
          {/* Cart Actions */}
          <div style={styles.cartActionsWrapper}>
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginBottom: '0.75rem' }}>
              <button 
                style={styles.discountBtn} 
                disabled={cartItems.length === 0}
                onClick={() => setShowCouponModal(true)}
              >
                <Tag size={16} /> Discount Code
              </button>
              <button 
                style={styles.sendKdsBtn} 
                disabled={cartItems.length === 0}
                onClick={handleSendToKitchen}
              >
                <Send size={16} /> Send to Kitchen
              </button>
            </div>
            
            <button 
              className="btn-primary" 
              style={styles.goToPaymentBtn} 
              disabled={cartItems.length === 0}
              onClick={() => setShowPaymentScreen(true)}
            >
              Go to Payment <ChevronRight size={18} />
            </button>
          </div>
        </section>
      </div>

      {/* ==========================================
          MODAL: FULLSCREEN PAYMENT SCREEN
         ========================================== */}
      {showPaymentScreen && (
        <div className="modal-overlay">
          <div className="payment-screen-content">
            
            {/* Left Column: Order Summary Review */}
            <div className="payment-screen-left">
              <div className="payment-screen-header">
                <h2>Review Seating Order</h2>
                {selectedTable && (
                  <span style={{
                    backgroundColor: '#7c5dfa',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontWeight: 600
                  }}>
                    {selectedTable.tableNumber}
                  </span>
                )}
              </div>

              {/* Order Items List */}
              <div className="payment-items-summary">
                {cartItems.map(item => (
                  <div key={item.product.id} className="payment-item-row">
                    <span>{item.product.name} x{item.quantity}</span>
                    <span style={{ fontWeight: 600 }}>
                      ${(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary Totals */}
              <div style={{...styles.cartSummary, width: '100%', padding: 0, borderTop: 'none'}}>
                <div style={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span>${summary.subtotal.toFixed(2)}</span>
                </div>
                {summary.discounts > 0 && (
                  <div style={{...styles.summaryRow, color: 'var(--color-success-light)'}}>
                    <span>Discounts {activeCoupon && `(${activeCoupon.code})`}</span>
                    <span>-${summary.discounts.toFixed(2)}</span>
                  </div>
                )}
                <div style={styles.summaryRow}>
                  <span>Tax (5%)</span>
                  <span>${summary.tax.toFixed(2)}</span>
                </div>
                <div style={{...styles.summaryRow, ...styles.totalRow, marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #2e2e36'}}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Total Amount</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>${summary.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Back to Cart Action */}
              <button 
                className="btn-secondary" 
                style={{ marginTop: 'auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.9rem' }}
                onClick={() => setShowPaymentScreen(false)}
              >
                <X size={18} /> Back to Cart
              </button>
            </div>

            {/* Right Column: Payment Methods Portal */}
            <div className="payment-screen-right">
              <div>
                <div style={{...styles.paymentHeader, marginBottom: '1.5rem'}}>
                  <CreditCard size={20} />
                  <h2>Select Payment</h2>
                </div>

                {/* Payment Toggles */}
                <div style={{...styles.paymentSelector, marginBottom: '1.5rem'}}>
                  {['Cash', 'Card', 'UPI'].map(method => (
                    <button
                      key={method}
                      style={{
                        ...styles.payToggleBtn,
                        ...(selectedPayment === method ? styles.payToggleActive : {})
                      }}
                      onClick={() => { setSelectedPayment(method); setAmountPaid(''); }}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {/* Dynamic Payment Details Area */}
                <div style={{...styles.paymentDetailsArea, marginBottom: '1.5rem'}}>
                  {selectedPayment === 'Cash' && (
                    <div style={styles.paymentInputBlock}>
                      <div style={styles.payInputLabel}>Amount Received</div>
                      <div style={styles.largeValueText}>${amountPaid || '0'}</div>
                      {changeDue > 0 && (
                        <div style={styles.changeDueRow}>
                          <span>Change Due:</span>
                          <span style={{ color: 'var(--color-success-light)', fontWeight: 600 }}>
                            ${changeDue.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedPayment === 'Card' && (
                    <div style={styles.paymentInputBlock}>
                      <label style={styles.payInputLabel}>Card Transaction Reference</label>
                      <input 
                        type="text" 
                        placeholder="Enter reference number"
                        value={cardRef}
                        onChange={(e) => setCardRef(e.target.value)}
                        style={styles.cardRefInput}
                      />
                    </div>
                  )}

                  {selectedPayment === 'UPI' && (
                    <div style={styles.upiQrBlock}>
                      <div style={styles.qrCodeBox}>
                        <div style={styles.qrPlaceholder}>
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=cafe@ybl%26am=${summary.total}`} 
                            alt="UPI QR Code" 
                            style={styles.qrImage}
                          />
                        </div>
                      </div>
                      <p style={styles.qrText}>Scan to Pay: <strong>${summary.total.toFixed(2)}</strong></p>
                    </div>
                  )}
                </div>

                {/* Numpad */}
                <div style={{...styles.numpadGrid, opacity: selectedPayment === 'Cash' ? 1 : 0.15, marginBottom: '1.5rem'}}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'].map(val => (
                    <button
                      key={val}
                      disabled={selectedPayment !== 'Cash'}
                      style={styles.numBtn}
                      onClick={() => handleNumPress(val)}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirm Payment button */}
              <button 
                className="btn-primary" 
                style={styles.checkoutSubmitBtn} 
                disabled={cartItems.length === 0}
                onClick={handleConfirmPayment}
              >
                <Check size={18} /> Confirm & Pay
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: FLOOR PLAN & TABLE SELECTOR
         ========================================== */}
      {showTablePopup && (
        <div className="modal-overlay">
          <div className="modal-content" style={styles.tablePopupContent}>
            <div style={styles.modalHeaderRow}>
              <h2>Dining Room Layout Selector</h2>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowTablePopup(false)} />
            </div>

            {/* Floor Tabs */}
            <div style={styles.floorSelectorTabs}>
              {floors.map((floor, index) => (
                <button
                  key={floor.id}
                  style={{
                    ...styles.floorTab,
                    ...(activeFloorIndex === index ? styles.floorTabActive : {})
                  }}
                  onClick={() => setActiveFloorIndex(index)}
                >
                  {floor.name}
                </button>
              ))}
            </div>

            {/* Grid of Tables */}
            <div style={styles.tablesSelectorGrid}>
              {floors[activeFloorIndex]?.tables.map(table => {
                const isOccupied = occupiedTables.has(table.id);
                return (
                  <button
                    key={table.id}
                    style={{
                      ...styles.tableSelectCard,
                      ...(isOccupied ? styles.tableSelectCardOccupied : {}),
                      ...(selectedTable?.id === table.id ? styles.tableSelectCardActive : {})
                    }}
                    onClick={() => handleSelectTable(table)}
                  >
                    <div style={styles.tableSelectNo}>{table.tableNumber}</div>
                    <div style={styles.tableSelectSeats}>{table.seats} Seats</div>
                    {isOccupied && <div style={styles.tableOccupiedBadge}>Occupied</div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: REDEEM COUPON CODE
         ========================================== */}
      {showCouponModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <X size={20} className="modal-close" onClick={() => setShowCouponModal(false)} />
            <h2 style={{ marginBottom: '1rem' }}>Enter Coupon Code</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input 
                type="text" 
                placeholder="e.g. CAFE10"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                style={{ flexGrow: 1 }}
              />
              <button className="btn-primary" onClick={handleRedeemCoupon}>
                Redeem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: DIGITAL RECEIPT & EMAIL PRINT
         ========================================== */}
      {showReceiptModal && lastPaidOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={styles.receiptModal}>
            <div style={styles.receiptBrand}>
              <div style={styles.logo}>odoo</div>
              <h3>Odoo Cafe POS</h3>
              <p>Receipt Number: {lastPaidOrder.orderNumber}</p>
              <p>{new Date(lastPaidOrder.createdAt).toLocaleString()}</p>
            </div>

            <div style={styles.receiptDivider}></div>

            <div style={styles.receiptDetails}>
              <div>Table: {lastPaidOrder.table?.tableNumber}</div>
              <div>Cashier: {user.name}</div>
            </div>

            <div style={styles.receiptDivider}></div>

            {/* List of paid items */}
            <div style={styles.receiptItemsList}>
              {lastPaidOrder.items?.map(item => (
                <div key={item.id} style={styles.receiptItemLine}>
                  <span>{item.product?.name} x{item.quantity}</span>
                  <span>${parseFloat(item.total).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={styles.receiptDivider}></div>

            <div style={styles.receiptSummary}>
              <div style={styles.receiptSumRow}>
                <span>Subtotal:</span>
                <span>${parseFloat(lastPaidOrder.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(lastPaidOrder.discountAmount) > 0 && (
                <div style={styles.receiptSumRow}>
                  <span>Discount:</span>
                  <span>-${parseFloat(lastPaidOrder.discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div style={styles.receiptSumRow}>
                <span>Tax (5%):</span>
                <span>${parseFloat(lastPaidOrder.tax).toFixed(2)}</span>
              </div>
              <div style={{...styles.receiptSumRow, fontWeight: 'bold'}}>
                <span>Total Paid:</span>
                <span>${parseFloat(lastPaidOrder.total).toFixed(2)}</span>
              </div>
            </div>

            <div style={styles.receiptDivider}></div>

            {/* Email form */}
            <div style={styles.receiptActionsForm}>
              <label style={styles.label}>Email Receipt to Customer</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input 
                  type="email" 
                  placeholder="customer@email.com" 
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
                <button 
                  className="btn-primary" 
                  style={{ padding: '0.5rem 1rem' }}
                  onClick={() => {
                    setUiSuccess(`Receipt emailed to ${emailAddress}!`);
                    setShowReceiptModal(false);
                    setEmailAddress('');
                  }}
                >
                  <Mail size={16} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn-secondary" 
                style={{ flexGrow: 1, display: 'flex', justifyCenter: 'center', gap: '0.5rem', padding: '0.6rem' }}
                onClick={() => {
                  alert('Sending print job to system receipt printer...');
                  setShowReceiptModal(false);
                }}
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button 
                className="btn-primary" 
                style={{ flexGrow: 1, padding: '0.6rem' }}
                onClick={() => setShowReceiptModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#121214'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1a1a1e',
    borderBottom: '1px solid #2e2e36',
    zIndex: 10
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  logo: {
    fontWeight: 'bold',
    fontSize: '1.2rem',
    color: '#ffffff',
    backgroundColor: '#7c5dfa',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px'
  },
  tableSelectorBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#232329',
    color: '#ffffff',
    border: '1px solid #2e2e36',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontWeight: 500,
    fontSize: '0.9rem'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  employeeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    color: '#a0a0ab',
    backgroundColor: '#232329',
    padding: '0.5rem 1rem',
    borderRadius: '20px'
  },
  empDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#4caf50'
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px 300px',
    flexGrow: 1,
    overflow: 'hidden'
  },
  
  // Products section
  productSection: {
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem',
    overflowY: 'auto',
    borderRight: '1px solid #2e2e36'
  },
  searchBarWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
    flexShrink: 0
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    color: '#6f6f76'
  },
  searchInput: {
    paddingLeft: '3rem'
  },
  categoryTabs: {
    display: 'flex',
    gap: '0.5rem',
    overflowX: 'auto',
    paddingBottom: '0.5rem',
    marginBottom: '1.5rem',
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  catTab: {
    padding: '0.5rem 1rem',
    backgroundColor: '#232329',
    color: '#a0a0ab',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 500
  },
  catTabActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff'
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '1rem',
    alignContent: 'start',
    overflowY: 'auto',
    flexGrow: 1
  },
  productCard: {
    backgroundColor: '#1a1a1e',
    border: '1px solid #2e2e36',
    borderRadius: '12px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '110px',
    cursor: 'pointer',
    transition: 'all 0.15s ease-in-out'
  },
  productName: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#ffffff',
    lineHeight: 1.3
  },
  productCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: '0.5rem'
  },
  productUom: {
    fontSize: '0.75rem',
    color: '#6f6f76'
  },
  productPrice: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#ffffff'
  },

  // Cart Section
  cartSection: {
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #2e2e36',
    backgroundColor: '#1a1a1e',
    overflow: 'hidden'
  },
  cartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #2e2e36'
  },
  cartTableName: {
    marginLeft: 'auto',
    backgroundColor: '#7c5dfa',
    color: '#ffffff',
    fontSize: '0.8rem',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    fontWeight: 600
  },
  cartList: {
    flexGrow: 1,
    overflowY: 'auto',
    padding: '1rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  emptyCart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#6f6f76',
    textAlign: 'center'
  },
  cartItemRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #232329'
  },
  cartItemInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 500,
    fontSize: '0.9rem'
  },
  cartItemPrice: {
    color: '#a0a0ab'
  },
  cartItemActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  qtyBtn: {
    padding: '0.2rem',
    borderRadius: '4px',
    backgroundColor: '#232329',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  qtyText: {
    fontSize: '0.9rem',
    fontWeight: 600,
    minWidth: '20px',
    textAlign: 'center'
  },
  lineTotal: {
    marginLeft: 'auto',
    fontWeight: 600,
    fontSize: '0.9rem'
  },
  cartSummary: {
    padding: '1.25rem 1.5rem',
    backgroundColor: '#232329',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    borderTop: '1px solid #2e2e36'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: '#a0a0ab'
  },
  totalRow: {
    borderTop: '1px solid #2e2e36',
    paddingTop: '0.5rem',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#ffffff',
    marginTop: '0.25rem'
  },
  cartActionsWrapper: {
    padding: '1rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    borderTop: '1px solid #2e2e36',
    backgroundColor: '#1a1a1e'
  },
  discountBtn: {
    flex: 1,
    padding: '0.75rem',
    fontSize: '0.85rem',
    border: '1px solid #2e2e36',
    backgroundColor: '#232329',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  sendKdsBtn: {
    flex: 1.2,
    padding: '0.75rem',
    fontSize: '0.85rem',
    backgroundColor: '#2e7d32',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  goToPaymentBtn: {
    width: '100%',
    padding: '0.9rem',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    borderRadius: '8px'
  },

  // Payment Section
  paymentSection: {
    display: 'flex',
    flexDirection: 'column',
    padding: '1.25rem',
    backgroundColor: '#121214',
    overflowY: 'auto'
  },
  paymentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem'
  },
  paymentSelector: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.25rem'
  },
  payToggleBtn: {
    flex: 1,
    padding: '0.6rem',
    backgroundColor: '#232329',
    color: '#a0a0ab',
    border: '1px solid #2e2e36',
    fontWeight: 600,
    fontSize: '0.85rem'
  },
  payToggleActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    borderColor: 'var(--color-primary)'
  },
  paymentDetailsArea: {
    backgroundColor: '#1a1a1e',
    border: '1px solid #2e2e36',
    borderRadius: '10px',
    padding: '1rem',
    marginBottom: '1.25rem',
    minHeight: '100px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  paymentInputBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  payInputLabel: {
    fontSize: '0.75rem',
    color: '#6f6f76',
    textTransform: 'uppercase',
    fontWeight: 600
  },
  largeValueText: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#ffffff',
    textAlign: 'right'
  },
  changeDueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
    borderTop: '1px dashed #2e2e36',
    paddingTop: '0.5rem'
  },
  cardRefInput: {
    width: '100%'
  },
  upiQrBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem'
  },
  qrCodeBox: {
    padding: '4px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  qrImage: {
    width: '120px',
    height: '120px'
  },
  qrText: {
    fontSize: '0.75rem',
    color: '#a0a0ab',
    textAlign: 'center'
  },
  numpadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
    marginBottom: '1.25rem'
  },
  numBtn: {
    padding: '0.85rem',
    backgroundColor: '#232329',
    color: '#ffffff',
    fontSize: '1.1rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: '1px solid #2e2e36'
  },
  checkoutSubmitBtn: {
    width: '100%',
    padding: '1rem',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },

  // Layout selection pop-up
  tablePopupContent: {
    maxWidth: '700px'
  },
  modalHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  floorSelectorTabs: {
    display: 'flex',
    gap: '0.5rem',
    borderBottom: '1px solid #2e2e36',
    paddingBottom: '0.5rem',
    marginBottom: '1.5rem'
  },
  floorTab: {
    padding: '0.5rem 1.25rem',
    color: '#a0a0ab',
    fontSize: '0.9rem',
    fontWeight: 600
  },
  floorTabActive: {
    color: '#ffffff',
    borderBottom: '3px solid var(--color-primary)'
  },
  tablesSelectorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '1rem'
  },
  tableSelectCard: {
    backgroundColor: '#232329',
    border: '1px solid #2e2e36',
    borderRadius: '10px',
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    transition: 'all 0.15s'
  },
  tableSelectCardOccupied: {
    border: '1px solid #ed6c02',
    backgroundColor: 'rgba(237, 108, 2, 0.05)'
  },
  tableSelectCardActive: {
    backgroundColor: 'var(--color-primary)',
    borderColor: 'var(--color-primary)',
    color: '#ffffff'
  },
  tableSelectNo: {
    fontSize: '1.1rem',
    fontWeight: 700
  },
  tableSelectSeats: {
    fontSize: '0.8rem',
    color: '#a0a0ab'
  },
  tableOccupiedBadge: {
    marginTop: '0.5rem',
    backgroundColor: '#ed6c02',
    color: '#ffffff',
    fontSize: '0.65rem',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
    fontWeight: 700,
    textTransform: 'uppercase'
  },

  // Alert Banners
  errorBanner: {
    position: 'fixed',
    top: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#c83f3f',
    color: '#ffffff',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    cursor: 'pointer'
  },
  successBanner: {
    position: 'fixed',
    top: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#2e7d32',
    color: '#ffffff',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    cursor: 'pointer'
  },

  // Receipt Modal
  receiptModal: {
    maxWidth: '380px',
    backgroundColor: '#ffffff',
    color: '#000000',
    padding: '2rem 1.5rem',
    borderRadius: '8px',
    fontFamily: 'monospace'
  },
  receiptBrand: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.85rem'
  },
  receiptDivider: {
    borderTop: '1px dashed #cccccc',
    margin: '1rem 0'
  },
  receiptDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem'
  },
  receiptItemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    fontSize: '0.85rem'
  },
  receiptItemLine: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  receiptSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    fontSize: '0.85rem'
  },
  receiptSumRow: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  receiptActionsForm: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.8rem',
    color: '#333333'
  }
};

export default PosTerminalView;
