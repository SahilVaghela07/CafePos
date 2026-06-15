// =========================================================================
// ORDERS HISTORY VIEW
// Purpose: Lists all orders in the current session. Allows viewing order details
//          and loading Draft orders back to the cart for editing/checkout.
// Used in: frontend/src/App.jsx
// =========================================================================

import React, { useState, useEffect } from 'react';
import { Search, Eye, Edit3, Trash2, Calendar, Clipboard, User, CreditCard } from 'lucide-react';
import api from '../services/api';

const OrdersHistoryView = ({ onEditOrder }) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await api.orders.getOrders();
      setOrders(data);
      setError('');
    } catch (err) {
      setError('Failed to load orders history.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (orderId) => {
    try {
      const details = await api.orders.getOrderDetails(orderId);
      setSelectedOrder(details);
      setShowDetailModal(true);
    } catch (err) {
      setError('Failed to load order details.');
    }
  };

  const handleEditClick = (order) => {
    setShowDetailModal(false);
    // Call callback in App.jsx to load order in POS cart and switch view
    onEditOrder(order);
  };

  // Filter orders by order number, customer name, or table number
  const filteredOrders = orders.filter(o => {
    const term = searchQuery.toLowerCase();
    const orderNoMatches = o.orderNumber.toLowerCase().includes(term);
    const customerMatches = o.customer?.name.toLowerCase().includes(term);
    const tableMatches = o.table?.tableNumber.toLowerCase().includes(term);
    return orderNoMatches || customerMatches || tableMatches;
  });

  return (
    <div className="main-content" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Order History</h1>
          <p style={styles.subtitle}>Review session transactions and manage draft tickets</p>
        </div>
        <button style={styles.refreshBtn} onClick={fetchOrders}>Refresh</button>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      {/* Filter and Search Bar */}
      <div style={styles.searchBarWrapper}>
        <Search size={18} style={styles.searchIcon} />
        <input 
          type="text" 
          placeholder="Filter by Order Number, Customer, or Table..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Orders Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Date/Time</th>
              <th>Table</th>
              <th>Customer</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" style={styles.emptyRow}>
                  No orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>{o.orderNumber}</td>
                  <td>{new Date(o.createdAt).toLocaleString()}</td>
                  <td>{o.table?.tableNumber || 'Takeaway'}</td>
                  <td>{o.customer?.name || 'Walk-in'}</td>
                  <td style={{ fontWeight: 600 }}>${parseFloat(o.total).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${
                      o.status === 'Paid' ? 'badge-success' : 
                      o.status === 'Draft' ? 'badge-info' : 'badge-danger'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <div style={styles.actionButtons}>
                      <button 
                        style={styles.actionBtn} 
                        onClick={() => handleViewDetails(o.id)}
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                      {o.status === 'Draft' && (
                        <button 
                          style={{...styles.actionBtn, color: '#29b6f6'}} 
                          onClick={() => handleEditClick(o)}
                          title="Edit draft order"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ==========================================
          MODAL: ORDER DETAILS VIEW
         ========================================== */}
      {showDetailModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2>Order Details: {selectedOrder.orderNumber}</h2>
              <span className={`badge ${
                selectedOrder.status === 'Paid' ? 'badge-success' : 
                selectedOrder.status === 'Draft' ? 'badge-info' : 'badge-danger'
              }`}>
                {selectedOrder.status}
              </span>
            </div>

            <div style={styles.detailsGrid}>
              <div style={styles.detailsField}>
                <Calendar size={16} />
                <span>Date: <strong>{new Date(selectedOrder.createdAt).toLocaleString()}</strong></span>
              </div>
              <div style={styles.detailsField}>
                <Clipboard size={16} />
                <span>Table: <strong>{selectedOrder.table?.tableNumber || 'Takeaway'}</strong></span>
              </div>
              <div style={styles.detailsField}>
                <User size={16} />
                <span>Customer: <strong>{selectedOrder.customer?.name || 'Walk-in'}</strong></span>
              </div>
              {selectedOrder.status === 'Paid' && (
                <div style={styles.detailsField}>
                  <CreditCard size={16} />
                  <span>Paid via: <strong>{selectedOrder.paymentMethod}</strong></span>
                </div>
              )}
            </div>

            <h3 style={styles.itemsTitle}>Items Summary</h3>
            <div style={styles.itemsBox}>
              {selectedOrder.items?.map(item => (
                <div key={item.id} style={styles.itemLine}>
                  <div style={styles.itemLineLeft}>
                    <span style={styles.itemQty}>{item.quantity}x</span>
                    <span>{item.product?.name}</span>
                  </div>
                  <span style={styles.itemPrice}>${parseFloat(item.total).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Total Billing Box */}
            <div style={styles.billingSummary}>
              <div style={styles.billRow}>
                <span>Subtotal:</span>
                <span>${parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(selectedOrder.discountAmount) > 0 && (
                <div style={{...styles.billRow, color: 'var(--color-success-light)'}}>
                  <span>Discount:</span>
                  <span>-${parseFloat(selectedOrder.discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div style={styles.billRow}>
                <span>Tax:</span>
                <span>${parseFloat(selectedOrder.tax).toFixed(2)}</span>
              </div>
              <div style={{...styles.billRow, ...styles.billTotalRow}}>
                <span>Total:</span>
                <span>${parseFloat(selectedOrder.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={styles.modalActions}>
              {selectedOrder.status === 'Draft' && (
                <button 
                  className="btn-primary" 
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                  onClick={() => handleEditClick(selectedOrder)}
                >
                  <Edit3 size={16} /> Edit Order
                </button>
              )}
              <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
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
  refreshBtn: {
    backgroundColor: '#c83f3f',
    color: '#ffffff',
    padding: '0.6rem 1.25rem',
    fontWeight: 600,
    borderRadius: '8px'
  },
  errorAlert: {
    backgroundColor: 'rgba(200, 63, 63, 0.15)',
    border: '1px solid #c83f3f',
    color: '#ff5252',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem'
  },
  searchBarWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1.5rem',
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
  emptyRow: {
    textAlign: 'center',
    padding: '3rem',
    color: '#6f6f76'
  },
  actionButtons: {
    display: 'flex',
    gap: '0.5rem'
  },
  actionBtn: {
    padding: '0.4rem',
    borderRadius: '4px',
    backgroundColor: '#232329',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Modal Details
  modalContent: {
    maxWidth: '550px'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    borderBottom: '1px solid #2e2e36',
    paddingBottom: '0.75rem'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
    color: '#a0a0ab'
  },
  detailsField: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  itemsTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: '0.75rem',
    color: '#ffffff'
  },
  itemsBox: {
    backgroundColor: '#232329',
    borderRadius: '8px',
    padding: '1rem',
    maxHeight: '180px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  itemLine: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem'
  },
  itemLineLeft: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  itemQty: {
    fontWeight: 700,
    color: 'var(--color-primary)'
  },
  itemPrice: {
    fontWeight: 600
  },
  billingSummary: {
    borderTop: '1px solid #2e2e36',
    paddingTop: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1.5rem'
  },
  billRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: '#a0a0ab'
  },
  billTotalRow: {
    borderTop: '1px solid #2e2e36',
    paddingTop: '0.5rem',
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#ffffff'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem'
  }
};

export default OrdersHistoryView;
