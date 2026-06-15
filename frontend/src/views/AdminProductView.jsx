// =========================================================================
// ADMIN PRODUCT CATALOG MANAGEMENT VIEW
// Purpose: Allows Admin to perform CRUD on products. Supports inline,
//          on-the-fly Category creation inside the product editor form.
// Used in: frontend/src/App.jsx
// =========================================================================

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, AlertCircle } from 'lucide-react';
import api from '../services/api';

const AdminProductView = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [uom, setUom] = useState('pcs');
  const [tax, setTax] = useState(5.0);
  const [description, setDescription] = useState('');

  // Inline Category Creator States (On-the-fly creation)
  const [showInlineCat, setShowInlineCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#8B4513');
  const inlineColors = ['#8B4513', '#228B22', '#FF69B4', '#D2691E', '#BA55D3', '#c83f3f'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const prodList = await api.products.getProducts();
      const catList = await api.categories.getCategories();
      setProducts(prodList);
      setCategories(catList);
    } catch (err) {
      setError('Failed to load menu catalog lists.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setCategoryId('');
    setPrice('');
    setUom('pcs');
    setTax(5.0);
    setDescription('');
    setShowInlineCat(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setCategoryId(product.categoryId);
    setPrice(product.price);
    setUom(product.uom);
    setTax(product.tax);
    setDescription(product.description || '');
    setShowInlineCat(false);
    setShowModal(true);
  };

  // Handler: handleCategorySelectChange
  // Purpose: Checks if the user clicked the '+ Add New' option, and if so, opens the inline form.
  const handleCategorySelectChange = (e) => {
    const val = e.target.value;
    if (val === 'ADD_NEW_INLINE') {
      setShowInlineCat(true);
      setCategoryId(''); // Reset temporary selection
    } else {
      setCategoryId(val);
      setShowInlineCat(false);
    }
  };

  // Handler: handleCreateCategoryInline
  // Purpose: Saves a new category to DB on-the-fly without discarding product details.
  const handleCreateCategoryInline = async (e) => {
    e.preventDefault();
    if (!newCatName) return;

    try {
      const res = await api.categories.createCategory({
        name: newCatName,
        color: newCatColor
      });

      // Insert new category to dropdown array
      setCategories(prev => [...prev, res.category]);
      
      // Auto-select the newly created category ID in the product form
      setCategoryId(res.category.id);
      
      // Reset and hide inline category mini-form
      setNewCatName('');
      setShowInlineCat(false);
      setSuccess(`Category "${res.category.name}" created on-the-fly!`);
    } catch (err) {
      setError(err.message || 'Failed to create category inline.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!categoryId) {
      setError('Please select or create a category.');
      return;
    }

    const payload = {
      name,
      price: parseFloat(price),
      uom,
      tax: parseFloat(tax),
      description,
      categoryId: parseInt(categoryId, 10)
    };

    try {
      if (editingProduct) {
        await api.products.updateProduct(editingProduct.id, payload);
        setSuccess('Product updated successfully!');
      } else {
        await api.products.createProduct(payload);
        setSuccess('Product created successfully!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to save product.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    setError('');
    setSuccess('');

    try {
      await api.products.deleteProduct(id);
      setSuccess('Product deleted successfully.');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete product.');
    }
  };

  return (
    <div className="main-content" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Menu Products</h1>
          <p style={styles.subtitle}>Configure dishes, pricing, tax metrics, and units</p>
        </div>
        <button className="btn-primary" style={styles.addBtn} onClick={handleOpenCreateModal}>
          <Plus size={18} /> New Product
        </button>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}
      {success && <div style={styles.successAlert}>{success}</div>}

      {/* Products Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>UOM</th>
              <th>Tax Rate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="7" style={styles.emptyRow}>No products configured in catalog.</td>
              </tr>
            ) : (
              products.map(prod => (
                <tr key={prod.id}>
                  <td>#{prod.id}</td>
                  <td style={{ fontWeight: 600 }}>{prod.name}</td>
                  <td>
                    <span 
                      style={{
                        backgroundColor: prod.category?.color || '#232329',
                        color: '#ffffff',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      {prod.category?.name || 'Uncategorized'}
                    </span>
                  </td>
                  <td>${parseFloat(prod.price).toFixed(2)}</td>
                  <td>{prod.uom}</td>
                  <td>{prod.tax}%</td>
                  <td>
                    <div style={styles.actions}>
                      <button 
                        style={{...styles.actionBtn, color: '#29b6f6'}}
                        onClick={() => handleOpenEditModal(prod)}
                      >
                        <Edit size={16} /> Edit
                      </button>
                      <button 
                        style={{...styles.actionBtn, color: '#ff5252'}}
                        onClick={() => handleDelete(prod.id)}
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Main Modal Form */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={styles.modalContent}>
            <X size={20} className="modal-close" onClick={() => setShowModal(false)} />
            <h2>{editingProduct ? 'Modify Menu Product' : 'Add Menu Product'}</h2>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Product Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Cappuccino, Brownie"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Category Dropdown (with inline on-the-fly option) */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Category</label>
                <select 
                  value={categoryId} 
                  onChange={handleCategorySelectChange}
                  required={!showInlineCat}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                  <option value="ADD_NEW_INLINE" style={styles.inlineOptionText}>
                    + Add New Category (Inline)
                  </option>
                </select>
              </div>

              {/* Inline Category Creator panel (Only displays when "+ Add New" is selected) */}
              {showInlineCat && (
                <div style={styles.inlineCatPanel}>
                  <div style={styles.inlineHeader}>
                    <AlertCircle size={14} style={{ marginRight: 4 }} />
                    <span>Create Category Inline</span>
                  </div>
                  
                  <div style={styles.inlineInputGroup}>
                    <input 
                      type="text" 
                      placeholder="Category Name" 
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      style={styles.inlineInput}
                    />
                    <div style={styles.inlinePalette}>
                      {inlineColors.map(c => (
                        <button
                          key={c}
                          type="button"
                          style={{
                            ...styles.inlineColorBubble,
                            backgroundColor: c,
                            border: newCatColor === c ? '2px solid #ffffff' : 'none'
                          }}
                          onClick={() => setNewCatColor(c)}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={styles.inlineActions}>
                    <button type="button" style={styles.inlineCancelBtn} onClick={() => setShowInlineCat(false)}>
                      Cancel
                    </button>
                    <button type="button" style={styles.inlineAddBtn} onClick={handleCreateCategoryInline}>
                      Create Inline
                    </button>
                  </div>
                </div>
              )}

              <div style={styles.formRow}>
                <div style={{...styles.formGroup, flex: 1.2}}>
                  <label style={styles.label}>Base Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                <div style={{...styles.formGroup, flex: 0.8}}>
                  <label style={styles.label}>UOM</label>
                  <select value={uom} onChange={(e) => setUom(e.target.value)}>
                    <option value="pcs">pcs (piece)</option>
                    <option value="kg">kg (kilogram)</option>
                    <option value="L">L (litre)</option>
                  </select>
                </div>
                <div style={{...styles.formGroup, flex: 0.8}}>
                  <label style={styles.label}>Tax (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea 
                  rows="3" 
                  placeholder="Describe recipe or comments..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={styles.formActions}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Save Changes' : 'Create Product'}
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
  actions: {
    display: 'flex',
    gap: '1rem'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.85rem'
  },

  // Modal styling
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
  label: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#a0a0ab'
  },
  inlineOptionText: {
    fontWeight: 'bold',
    color: '#7c5dfa'
  },

  // Inline Category Creator
  inlineCatPanel: {
    backgroundColor: '#232329',
    border: '1px solid #2e2e36',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  inlineHeader: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.8rem',
    color: '#7c5dfa',
    fontWeight: 600,
    textTransform: 'uppercase'
  },
  inlineInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  inlineInput: {
    flex: 1.5,
    padding: '0.5rem 0.75rem',
    fontSize: '0.85rem',
    borderRadius: '6px'
  },
  inlinePalette: {
    flex: 1,
    display: 'flex',
    gap: '0.25rem'
  },
  inlineColorBubble: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    cursor: 'pointer'
  },
  inlineActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem'
  },
  inlineCancelBtn: {
    padding: '0.4rem 0.85rem',
    fontSize: '0.8rem',
    color: '#a0a0ab',
    backgroundColor: 'transparent',
    border: '1px solid #2e2e36'
  },
  inlineAddBtn: {
    padding: '0.4rem 0.85rem',
    fontSize: '0.8rem',
    color: '#ffffff',
    backgroundColor: '#7c5dfa',
    borderRadius: '6px',
    fontWeight: 600
  },

  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem'
  }
};

export default AdminProductView;
