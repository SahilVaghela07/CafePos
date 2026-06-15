// =========================================================================
// ADMIN USER & EMPLOYEE MANAGEMENT VIEW
// Purpose: Allows Admin to perform CRUD on employee/cashier accounts, toggle
//          archiving deactivations, and reset account passwords.
// Used in: frontend/src/App.jsx
// =========================================================================

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Key, ToggleLeft, ToggleRight, X } from 'lucide-react';
import api from '../services/api';

const AdminUserView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals & Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form Fields (Create User)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee'); // Admin | Employee

  // Form Fields (Change Password)
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.users.getUsers();
      setUsers(data);
    } catch (err) {
      setError('Failed to load user accounts list.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('Employee');
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.users.createUser({ name, email, password, role });
      setSuccess(`User account created successfully!`);
      setShowCreateModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user account.');
    }
  };

  const handleOpenPasswordModal = (usr) => {
    setSelectedUser(usr);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || !selectedUser) return;
    setError('');
    setSuccess('');

    try {
      await api.users.changePassword(selectedUser.id, newPassword);
      setSuccess(`Password updated for ${selectedUser.name}!`);
      setShowPasswordModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    }
  };

  const handleToggleArchive = async (usr) => {
    setError('');
    setSuccess('');
    try {
      const res = await api.users.toggleArchive(usr.id);
      setSuccess(res.message);
      fetchUsers();
    } catch (err) {
      setError('Failed to toggle archive status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this user account?')) return;
    setError('');
    setSuccess('');

    try {
      await api.users.deleteUser(id);
      setSuccess('User account deleted.');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete account.');
    }
  };

  return (
    <div className="main-content" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>User Management</h1>
          <p style={styles.subtitle}>Configure cashier accounts and administrator permissions</p>
        </div>
        <button className="btn-primary" style={styles.addBtn} onClick={handleOpenCreateModal}>
          <Plus size={18} /> New Account
        </button>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}
      {success && <div style={styles.successAlert}>{success}</div>}

      {/* Users Listing Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Email Address</th>
              <th>System Role</th>
              <th>Account Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" style={styles.emptyRow}>No user accounts configured.</td>
              </tr>
            ) : (
              users.map(usr => (
                <tr key={usr.id}>
                  <td>#{usr.id}</td>
                  <td style={{ fontWeight: 600 }}>{usr.name}</td>
                  <td>{usr.email}</td>
                  <td>
                    <span className={`badge ${usr.role === 'Admin' ? 'badge-success' : 'badge-info'}`}>
                      {usr.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${usr.isArchived ? 'badge-danger' : 'badge-success'}`}>
                      {usr.isArchived ? 'Archived (Inactive)' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <div style={styles.actions}>
                      <button 
                        style={{...styles.actionBtn, color: '#29b6f6'}}
                        onClick={() => handleOpenPasswordModal(usr)}
                        title="Reset password"
                      >
                        <Key size={14} style={{ marginRight: 4 }} /> Password
                      </button>
                      
                      <button 
                        style={{...styles.actionBtn, color: usr.isArchived ? '#4caf50' : '#ed6c02'}}
                        onClick={() => handleToggleArchive(usr)}
                        title={usr.isArchived ? 'Activate' : 'Deactivate'}
                      >
                        {usr.isArchived ? 'Activate' : 'Archive'}
                      </button>

                      <button 
                        style={{...styles.actionBtn, color: '#ff5252'}}
                        onClick={() => handleDelete(usr.id)}
                        title="Delete permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ==========================================
          MODAL: CREATE NEW ACCOUNT
         ========================================== */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <X size={20} className="modal-close" onClick={() => setShowCreateModal(false)} />
            <h2>Create New User Account</h2>

            <form onSubmit={handleCreateSubmit} style={styles.form}>
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
                  placeholder="cashier@cafe.pos"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Password</label>
                <input 
                  type="password" 
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>System Permissions Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="Employee">Employee (POS Cashier View Only)</option>
                  <option value="Admin">Admin (Full Backend Configuration Access)</option>
                </select>
              </div>

              <div style={styles.formActions}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: RESET PASSWORD
         ========================================== */}
      {showPasswordModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <X size={20} className="modal-close" onClick={() => setShowPasswordModal(false)} />
            <h2>Reset Password: {selectedUser.name}</h2>
            
            <form onSubmit={handlePasswordSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>New Password</label>
                <input 
                  type="password" 
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formActions}>
                <button type="button" className="btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Update Password</button>
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
    gap: '0.75rem'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.85rem',
    fontWeight: 500
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
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem'
  }
};

export default AdminUserView;
