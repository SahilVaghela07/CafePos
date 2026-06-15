// =========================================================================
// ADMIN PROMOTIONS & COUPONS CONFIGURATION VIEW
// Purpose: Allows Admin to configure manual coupon codes and automated campaigns.
// Used in: frontend/src/App.jsx
// =========================================================================

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Tag, Percent } from 'lucide-react';
import api from '../services/api';

const AdminPromotionView = () => {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals & Form States
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState('Coupon'); // Coupon | Automated
  const [code, setCode] = useState(''); // Only for Coupons
  const [applyOn, setApplyOn] = useState('Order'); // Product | Order (Automated only)
  const [productId, setProductId] = useState(''); // Only for Product-level automated
  const [minQuantity, setMinQuantity] = useState(1); // Only for Product-level automated
  const [minOrderAmount, setMinOrderAmount] = useState(0.00); // Only for Order-level automated
  const [discountType, setDiscountType] = useState('Percentage'); // Percentage | Fixed
  const [discountValue, setDiscountValue] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const promoList = await api.promotions.getPromotions();
      const prodList = await api.products.getProducts();
      setPromotions(promoList);
      setProducts(prodList);
    } catch (err) {
      setError('Failed to load campaigns catalog.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPromotion(null);
    setName('');
    setType('Coupon');
    setCode('');
    setApplyOn('Order');
    setProductId('');
    setMinQuantity(1);
    setMinOrderAmount(0.00);
    setDiscountType('Percentage');
    setDiscountValue('');
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEditModal = (promo) => {
    setEditingPromotion(promo);
    setName(promo.name);
    setType(promo.type);
    setCode(promo.code || '');
    setApplyOn(promo.applyOn);
    setProductId(promo.productId || '');
    setMinQuantity(promo.minQuantity || 1);
    setMinOrderAmount(promo.minOrderAmount || 0.00);
    setDiscountType(promo.discountType);
    setDiscountValue(promo.discountValue);
    setIsActive(promo.isActive);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (type === 'Coupon' && !code) {
      setError('Coupon code is required.');
      return;
    }
    if (type === 'Automated' && applyOn === 'Product' && !productId) {
      setError('Please select a target product for the automated promotion.');
      return;
    }
    if (!discountValue) {
      setError('Discount value is required.');
      return;
    }

    const payload = {
      name,
      type,
      code: type === 'Coupon' ? code.toUpperCase() : null,
      applyOn: type === 'Coupon' ? 'Order' : applyOn,
      productId: (type === 'Automated' && applyOn === 'Product') ? parseInt(productId, 10) : null,
      minQuantity: (type === 'Automated' && applyOn === 'Product') ? parseInt(minQuantity, 10) : null,
      minOrderAmount: (type === 'Automated' && applyOn === 'Order') ? parseFloat(minOrderAmount) : null,
      discountType,
      discountValue: parseFloat(discountValue),
      isActive
    };

    try {
      if (editingPromotion) {
        await api.promotions.updatePromotion(editingPromotion.id, payload);
        setSuccess('Campaign updated successfully!');
      } else {
        await api.promotions.createPromotion(payload);
        setSuccess('New discount campaign registered!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to save promotion settings.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this promotion rule?')) return;
    setError('');
    setSuccess('');

    try {
      await api.promotions.deletePromotion(id);
      setSuccess('Campaign deleted successfully.');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete promotion rule.');
    }
  };

  const handleToggleActive = async (promo) => {
    try {
      await api.promotions.updatePromotion(promo.id, { isActive: !promo.isActive });
      fetchData();
    } catch (err) {
      setError('Failed to update promotion status.');
    }
  };

  return (
    <div className="main-content" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Coupons & Promotions</h1>
          <p style={styles.subtitle}>Manage checkout coupon codes and automated kitchen discounts</p>
        </div>
        <button className="btn-primary" style={styles.addBtn} onClick={handleOpenCreateModal}>
          <Plus size={18} /> New Promotion
        </button>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}
      {success && <div style={styles.successAlert}>{success}</div>}

      {/* Campaigns Listing Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Campaign Name</th>
              <th>Type</th>
              <th>Trigger Rule Details</th>
              <th>Discount</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.length === 0 ? (
              <tr>
                <td colSpan="6" style={styles.emptyRow}>No promotions configured.</td>
              </tr>
            ) : (
              promotions.map(promo => (
                <tr key={promo.id}>
                  <td style={{ fontWeight: 600 }}>{promo.name}</td>
                  <td>
                    <span className={`badge ${promo.type === 'Coupon' ? 'badge-info' : 'badge-warning'}`}>
                      {promo.type}
                    </span>
                  </td>
                  <td style={styles.ruleDetailText}>
                    {promo.type === 'Coupon' && (
                      <span>Coupon Code: <strong>{promo.code}</strong> (manual checkout)</span>
                    )}
                    {promo.type === 'Automated' && promo.applyOn === 'Product' && (
                      <span>Min Qty: <strong>{promo.minQuantity}</strong> on <strong>{promo.product?.name}</strong></span>
                    )}
                    {promo.type === 'Automated' && promo.applyOn === 'Order' && (
                      <span>Min Spend: <strong>${parseFloat(promo.minOrderAmount).toFixed(2)}</strong></span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {promo.discountType === 'Percentage' ? `${promo.discountValue}% Off` : `$${parseFloat(promo.discountValue).toFixed(2)} Off`}
                  </td>
                  <td>
                    <div style={styles.checkboxWrapper}>
                      <input 
                        type="checkbox" 
                        checked={promo.isActive}
                        onChange={() => handleToggleActive(promo)}
                        style={styles.tableToggle}
                      />
                    </div>
                  </td>
                  <td>
                    <div style={styles.actions}>
                      <button 
                        style={{...styles.actionBtn, color: '#29b6f6'}}
                        onClick={() => handleOpenEditModal(promo)}
                      >
                        Edit
                      </button>
                      <button 
                        style={{...styles.actionBtn, color: '#ff5252'}}
                        onClick={() => handleDelete(promo.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={styles.modalContent}>
            <X size={20} className="modal-close" onClick={() => setShowModal(false)} />
            <h2>{editingPromotion ? 'Edit Promotion Campaign' : 'Create Promotion Campaign'}</h2>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Campaign Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Summer Promo, Donut Deal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={{...styles.formGroup, flex: 1}}>
                  <label style={styles.label}>Promotion Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="Coupon">Manual Coupon (Code Entry)</option>
                    <option value="Automated">Automated (Auto-applied)</option>
                  </select>
                </div>

                {/* Show Coupon Code text input only for manual coupons */}
                {type === 'Coupon' && (
                  <div style={{...styles.formGroup, flex: 1}}>
                    <label style={styles.label}>Coupon Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CAFE10"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      required={type === 'Coupon'}
                    />
                  </div>
                )}
              </div>

              {/* Automated Rules configurations */}
              {type === 'Automated' && (
                <div style={styles.rulePanel}>
                  <h4 style={styles.ruleTitle}>Automated Rule Criteria</h4>
                  
                  <div style={styles.formGroup} style={{ marginBottom: '1rem' }}>
                    <label style={styles.label}>Apply Rules On</label>
                    <select value={applyOn} onChange={(e) => setApplyOn(e.target.value)}>
                      <option value="Order">Order Level (Total Bill Amount)</option>
                      <option value="Product">Product Level (Specific Item Quantity)</option>
                    </select>
                  </div>

                  {applyOn === 'Product' && (
                    <div style={styles.formRow}>
                      <div style={{...styles.formGroup, flex: 1.5}}>
                        <label style={styles.label}>Target Product</label>
                        <select 
                          value={productId} 
                          onChange={(e) => setProductId(e.target.value)}
                          required={applyOn === 'Product'}
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{...styles.formGroup, flex: 0.8}}>
                        <label style={styles.label}>Min Quantity</label>
                        <input 
                          type="number" 
                          min="1"
                          value={minQuantity}
                          onChange={(e) => setMinQuantity(e.target.value)}
                          required={applyOn === 'Product'}
                        />
                      </div>
                    </div>
                  )}

                  {applyOn === 'Order' && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Minimum Order Amount ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={minOrderAmount}
                        onChange={(e) => setMinOrderAmount(e.target.value)}
                        required={applyOn === 'Order'}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Discount Value */}
              <div style={styles.formRow}>
                <div style={{...styles.formGroup, flex: 1}}>
                  <label style={styles.label}>Discount Type</label>
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                    <option value="Percentage">Percentage Off (%)</option>
                    <option value="Fixed">Fixed Amount Off ($)</option>
                  </select>
                </div>
                <div style={{...styles.formGroup, flex: 1}}>
                  <label style={styles.label}>Discount Value</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder={discountType === 'Percentage' ? '10' : '5.00'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={styles.formGroupCheckbox}>
                <input 
                  type="checkbox" 
                  id="promoIsActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={styles.checkbox}
                />
                <label htmlFor="promoIsActive" style={styles.checkboxLabel}>
                  Active (This promotion can be validated and applied in POS checkout)
                </label>
              </div>

              <div style={styles.formActions}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {editingPromotion ? 'Save Changes' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#121214',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#a0a0ab',
    marginTop: '0.25rem'
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.25rem'
  },
  errorAlert: {
    backgroundColor: 'rgba(200, 63, 63, 0.15)',
    border: '1px solid #c83f3f',
    color: '#ff5252',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem'
  },
  successAlert: {
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
    border: '1px solid #2e7d32',
    color: '#4caf50',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem'
  },
  emptyRow: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6f6f76'
  },
  ruleDetailText: {
    fontSize: '0.9rem',
    color: '#a0a0ab'
  },
  checkboxWrapper: {
    display: 'flex',
    alignItems: 'center'
  },
  tableToggle: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  actions: {
    display: 'flex',
    gap: '1rem'
  },
  actionBtn: {
    fontSize: '0.85rem',
    fontWeight: 500
  },

  // Modal forms
  modalContent: {
    maxWidth: '550px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    marginTop: '1rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  formRow: {
    display: 'flex',
    gap: '1rem'
  },
  rulePanel: {
    backgroundColor: '#232329',
    border: '1px solid #2e2e36',
    borderRadius: '8px',
    padding: '1rem'
  },
  ruleTitle: {
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    color: '#7c5dfa',
    fontWeight: 700,
    marginBottom: '0.75rem',
    letterSpacing: '0.02em'
  },
  formGroupCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.25rem'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  checkboxLabel: {
    fontSize: '0.85rem',
    color: '#a0a0ab',
    cursor: 'pointer'
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#a0a0ab'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem'
  }
};

export default AdminPromotionView;
