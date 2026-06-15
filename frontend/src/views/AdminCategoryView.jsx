// =========================================================================
// ADMIN CATEGORY VIEW
// Purpose: Allows Admin to configure food categories and custom hex color themes.
// Used in: frontend/src/App.jsx
// =========================================================================

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import api from '../services/api';

const AdminCategoryView = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#8B4513'); // Default color

  const colorPalette = ['#8B4513', '#228B22', '#FF69B4', '#D2691E', '#BA55D3', '#008080', '#4682B4', '#D2691E', '#c83f3f'];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await api.categories.getCategories();
      setCategories(data);
    } catch (err) {
      setError('Failed to load category list.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setColor('#8B4513');
    setShowModal(true);
  };

  const handleOpenEditModal = (category) => {
    setEditingCategory(category);
    setName(category.name);
    setColor(category.color);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingCategory) {
        await api.categories.updateCategory(editingCategory.id, { name, color });
        setSuccess('Category updated successfully!');
      } else {
        await api.categories.createCategory({ name, color });
        setSuccess('Category created successfully!');
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      setError(err.message || 'Failed to save category.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? All products under this category will need update.')) return;
    setError('');
    setSuccess('');

    try {
      await api.categories.deleteCategory(id);
      setSuccess('Category deleted successfully.');
      fetchCategories();
    } catch (err) {
      setError(err.message || 'Failed to delete category.');
    }
  };

  return (
    <div className="main-content" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Menu Categories</h1>
          <p style={styles.subtitle}>Configure menu sections and visual colors</p>
        </div>
        <button className="btn-primary" style={styles.addBtn} onClick={handleOpenCreateModal}>
          <Plus size={18} /> New Category
        </button>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}
      {success && <div style={styles.successAlert}>{success}</div>}

      {/* Categories Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Category Name</th>
              <th>Color Tag</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan="4" style={styles.emptyRow}>No categories configured.</td>
              </tr>
            ) : (
              categories.map(cat => (
                <tr key={cat.id}>
                  <td>#{cat.id}</td>
                  <td style={{ fontWeight: 600 }}>{cat.name}</td>
                  <td>
                    <div style={styles.colorIndicatorRow}>
                      <span style={{...styles.colorBubble, backgroundColor: cat.color}}></span>
                      <span>{cat.color}</span>
                    </div>
                  </td>
                  <td>
                    <div style={styles.actions}>
                      <button 
                        style={{...styles.actionBtn, color: '#29b6f6'}}
                        onClick={() => handleOpenEditModal(cat)}
                      >
                        <Edit size={16} /> Edit
                      </button>
                      <button 
                        style={{...styles.actionBtn, color: '#ff5252'}}
                        onClick={() => handleDelete(cat.id)}
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

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <X size={20} className="modal-close" onClick={() => setShowModal(false)} />
            <h2>{editingCategory ? 'Edit Category' : 'Create Category'}</h2>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Category Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Coffee, Dessert"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Choose Color Theme</label>
                <div style={styles.colorPickerGrid}>
                  {colorPalette.map(c => (
                    <button
                      key={c}
                      type="button"
                      style={{
                        ...styles.paletteBubble,
                        backgroundColor: c,
                        border: color === c ? '3px solid #ffffff' : '1px solid #2e2e36'
                      }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
                  <input 
                    type="color" 
                    value={color} 
                    onChange={(e) => setColor(e.target.value)}
                    style={styles.htmlColorInput}
                  />
                  <span>Custom Color: <strong>{color}</strong></span>
                </div>
              </div>

              <div style={styles.formActions}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {editingCategory ? 'Save Changes' : 'Create Category'}
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
  colorIndicatorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  colorBubble: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'inline-block'
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
  label: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#a0a0ab'
  },
  colorPickerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(9, 1fr)',
    gap: '0.5rem'
  },
  paletteBubble: {
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer'
  },
  htmlColorInput: {
    width: '40px',
    height: '32px',
    padding: 0,
    border: 'none',
    cursor: 'pointer',
    backgroundColor: 'transparent'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem'
  }
};

export default AdminCategoryView;
