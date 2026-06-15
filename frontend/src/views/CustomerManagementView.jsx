// =========================================================================
// CUSTOMER PROFILE MANAGEMENT VIEW
// Purpose: Lists and manages customer directories, profiles, and CRUD entries.
// Used in: frontend/src/App.jsx
// =========================================================================

import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Edit, Trash2, Mail, Phone, User, X } from 'lucide-react';
import api from '../services/api';

const CustomerManagementView = ({ user }) => {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null); // null means creating a new record
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]); // Re-fetch when search query changes (supports live filter search)

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.customers.getCustomers(searchQuery);
      setCustomers(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch customer profile records.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setEmail('');
    setPhone('');
    setShowModal(true);
  };

  const handleOpenEditModal = (customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setEmail(customer.email || '');
    setPhone(customer.phone || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingCustomer) {
        // Update customer profile
        await api.customers.updateCustomer(editingCustomer.id, { name, email, phone });
        setSuccess('Customer profile updated successfully!');
      } else {
        // Create new customer profile
        await api.customers.createCustomer({ name, email, phone });
        setSuccess('Customer profile created successfully!');
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      setError(err.message || 'Failed to save customer profile details.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer record?')) return;
    setError('');
    setSuccess('');

    try {
      await api.customers.deleteCustomer(id);
      setSuccess('Customer profile deleted successfully.');
      fetchCustomers();
    } catch (err) {
      setError(err.message || 'Failed to delete customer record.');
    }
  };

  return (
    <div className="main-content" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Customer Directory</h1>
          <p style={styles.subtitle}>Manage customer profiles and contact details</p>
        </div>
        <button className="btn-primary" style={styles.addBtn} onClick={handleOpenCreateModal}>
          <UserPlus size={18} /> Add Customer
        </button>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}
      {success && <div style={styles.successAlert}>{success}</div>}

      {/* Search Input Bar */}
      <div style={styles.searchBarWrapper}>
        <Search size={18} style={styles.searchIcon} />
        <input 
          type="text" 
          placeholder="Search by Name, Email, or Phone number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Customer List Grid */}
      <div style={styles.grid}>
        {customers.length === 0 ? (
          <div style={styles.emptyGrid}>
            <User size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
            <h3>No Customer Profiles</h3>
            <p>Add customers to track transaction delivery addresses.</p>
          </div>
        ) : (
          customers.map(c => (
            <div key={c.id} style={styles.customerCard}>
              <div style={styles.cardHeader}>
                <div style={styles.avatar}>{c.name.charAt(0).toUpperCase()}</div>
                <div>
                  <h3 style={styles.customerName}>{c.name}</h3>
                  <span style={styles.idLabel}>ID: #{c.id}</span>
                </div>
              </div>

              <div style={styles.cardBody}>
                <div style={styles.contactLine}>
                  <Mail size={14} />
                  <span>{c.email || 'No Email'}</span>
                </div>
                <div style={styles.contactLine}>
                  <Phone size={14} />
                  <span>{c.phone || 'No Phone'}</span>
                </div>
              </div>

              <div style={styles.cardDivider}></div>

              <div style={styles.cardActions}>
                <button 
                  style={{...styles.actionBtn, color: '#29b6f6'}} 
                  onClick={() => handleOpenEditModal(c)}
                >
                  <Edit size={16} style={{ marginRight: 4 }} /> Edit
                </button>
                
                {/* Delete button restricted to admin roles only */}
                {user.role === 'Admin' && (
                  <button 
                    style={{...styles.actionBtn, color: '#ff5252'}} 
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 size={16} style={{ marginRight: 4 }} /> Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ==========================================
          MODAL: CREATE / EDIT CUSTOMER
         ========================================== */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <X size={20} className="modal-close" onClick={() => setShowModal(false)} />
            <h2 style={{ marginBottom: '1.5rem' }}>
              {editingCustomer ? 'Modify Customer Profile' : 'Add New Customer'}
            </h2>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name</label>
                <input 
                  type="text" 
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input 
                  type="email" 
                  placeholder="customer@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div style={styles.formActions}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingCustomer ? 'Save Changes' : 'Create Profile'}
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
  searchBarWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '2rem',
    maxWidth: '500px'
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    color: '#6f6f76'
  },
  searchInput: {
    paddingLeft: '3rem'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem'
  },
  emptyGrid: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    color: '#6f6f76',
    textAlign: 'center'
  },
  customerCard: {
    backgroundColor: '#1a1a1e',
    border: '1px solid #2e2e36',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: 'var(--shadow-sm)'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#7c5dfa',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    fontWeight: 'bold'
  },
  customerName: {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: '#ffffff'
  },
  idLabel: {
    fontSize: '0.75rem',
    color: '#6f6f76'
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1.25rem',
    fontSize: '0.85rem',
    color: '#a0a0ab'
  },
  contactLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  cardDivider: {
    borderTop: '1px solid #2e2e36',
    marginBottom: '1rem'
  },
  cardActions: {
    display: 'flex',
    gap: '1.5rem'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem',
    fontWeight: 500
  },
  
  // Form modal
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
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
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem'
  }
};

export default CustomerManagementView;
