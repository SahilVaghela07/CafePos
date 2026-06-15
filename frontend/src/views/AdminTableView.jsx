// =========================================================================
// ADMIN FLOOR PLAN & TABLE MANAGEMENT VIEW
// Purpose: Allows Admin to configure floor layouts and table seating capacities.
// Used in: frontend/src/App.jsx
// =========================================================================

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, AlertCircle } from 'lucide-react';
import api from '../services/api';

const AdminTableView = () => {
  const [floors, setFloors] = useState([]);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals & Forms States
  const [showFloorModal, setShowFloorModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingFloor, setEditingFloor] = useState(null);
  const [editingTable, setEditingTable] = useState(null);

  // Form Fields
  const [floorName, setFloorName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [seats, setSeats] = useState(4);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchLayout();
  }, []);

  const fetchLayout = async () => {
    setLoading(true);
    try {
      const data = await api.tables.getAdminTables();
      setFloors(data);
    } catch (err) {
      setError('Failed to load dining room layout.');
    } finally {
      setLoading(false);
    }
  };

  // Floor Operations
  const handleOpenFloorModal = (floor = null) => {
    setEditingFloor(floor);
    setFloorName(floor ? floor.name : '');
    setShowFloorModal(true);
  };

  const handleFloorSubmit = async (e) => {
    e.preventDefault();
    if (!floorName) return;
    setError('');
    setSuccess('');

    try {
      if (editingFloor) {
        await api.tables.updateFloor(editingFloor.id, floorName);
        setSuccess('Floor renamed successfully!');
      } else {
        await api.tables.createFloor(floorName);
        setSuccess('New dining floor created!');
      }
      setShowFloorModal(false);
      fetchLayout();
    } catch (err) {
      setError(err.message || 'Failed to save floor.');
    }
  };

  const handleDeleteFloor = async (floorId) => {
    if (!window.confirm('Delete this Floor? All tables under this floor will be deleted!')) return;
    setError('');
    setSuccess('');

    try {
      await api.tables.deleteFloor(floorId);
      setSuccess('Floor layout deleted successfully.');
      setActiveFloorIndex(0);
      fetchLayout();
    } catch (err) {
      setError(err.message || 'Failed to delete floor layout.');
    }
  };

  // Table Operations
  const handleOpenTableModal = (table = null) => {
    setEditingTable(table);
    setTableNumber(table ? table.tableNumber : '');
    setSeats(table ? table.seats : 4);
    setIsActive(table ? table.isActive : true);
    setShowTableModal(true);
  };

  const handleTableSubmit = async (e) => {
    e.preventDefault();
    if (!tableNumber || !seats) return;
    setError('');
    setSuccess('');

    const activeFloorId = floors[activeFloorIndex]?.id;
    if (!activeFloorId) {
      setError('Select or create a floor first.');
      return;
    }

    const payload = {
      tableNumber,
      seats: parseInt(seats, 10),
      isActive,
      floorId: activeFloorId
    };

    try {
      if (editingTable) {
        await api.tables.updateTable(editingTable.id, payload);
        setSuccess('Table settings updated!');
      } else {
        await api.tables.createTable(payload);
        setSuccess('Table added to floor plan layout!');
      }
      setShowTableModal(false);
      fetchLayout();
    } catch (err) {
      setError(err.message || 'Failed to save table.');
    }
  };

  const handleDeleteTable = async (tableId) => {
    if (!window.confirm('Remove this table from the floor plan?')) return;
    setError('');
    setSuccess('');

    try {
      await api.tables.deleteTable(tableId);
      setSuccess('Table deleted successfully.');
      fetchLayout();
    } catch (err) {
      setError(err.message || 'Failed to delete table.');
    }
  };

  const activeFloor = floors[activeFloorIndex];

  return (
    <div className="main-content" style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Floor Plan Setup</h1>
          <p style={styles.subtitle}>Configure layouts, table codes, and seating capacities</p>
        </div>
        <div style={styles.headerActions}>
          <button className="btn-secondary" style={styles.topBtn} onClick={() => handleOpenFloorModal(null)}>
            <Plus size={16} /> New Floor
          </button>
          <button 
            className="btn-primary" 
            style={styles.topBtn} 
            disabled={floors.length === 0}
            onClick={() => handleOpenTableModal(null)}
          >
            <Plus size={16} /> Add Table
          </button>
        </div>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}
      {success && <div style={styles.successAlert}>{success}</div>}

      {/* Floor Plan Designer Workspace */}
      {floors.length === 0 ? (
        <div style={styles.emptyLayout}>
          <AlertCircle size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
          <h3>No Floors Configured</h3>
          <p>Create a Floor (e.g. Main Hall, Garden) to start adding dining tables.</p>
        </div>
      ) : (
        <div style={styles.layoutArea}>
          {/* Floor selection tabs bar */}
          <div style={styles.floorTabsRow}>
            <div style={styles.tabsList}>
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

            {/* Rename/Delete Floor Actions */}
            {activeFloor && (
              <div style={styles.floorActions}>
                <button style={styles.floorSubActionBtn} onClick={() => handleOpenFloorModal(activeFloor)}>
                  Rename Floor
                </button>
                <button 
                  style={{...styles.floorSubActionBtn, color: '#ff5252'}}
                  onClick={() => handleDeleteFloor(activeFloor.id)}
                >
                  Delete Floor
                </button>
              </div>
            )}
          </div>

          {/* List of Tables under selected Floor */}
          <div style={styles.tablesTableContainer}>
            <h3 style={styles.tablesListTitle}>Tables layout for: {activeFloor?.name}</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Table Number</th>
                    <th>Seats Capacity</th>
                    <th>Active Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!activeFloor?.tables || activeFloor.tables.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={styles.emptyRow}>No tables added to this floor yet.</td>
                    </tr>
                  ) : (
                    activeFloor.tables.map(table => (
                      <tr key={table.id}>
                        <td style={{ fontWeight: 600 }}>{table.tableNumber}</td>
                        <td>{table.seats} Seats</td>
                        <td>
                          <span className={`badge ${table.isActive ? 'badge-success' : 'badge-danger'}`}>
                            {table.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={styles.actions}>
                            <button 
                              style={{...styles.actionBtn, color: '#29b6f6'}}
                              onClick={() => handleOpenTableModal(table)}
                            >
                              Edit
                            </button>
                            <button 
                              style={{...styles.actionBtn, color: '#ff5252'}}
                              onClick={() => handleDeleteTable(table.id)}
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
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CREATE / EDIT FLOOR
         ========================================== */}
      {showFloorModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <X size={20} className="modal-close" onClick={() => setShowFloorModal(false)} />
            <h2>{editingFloor ? 'Rename Floor Plan' : 'Create Floor Plan'}</h2>
            
            <form onSubmit={handleFloorSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Floor Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Ground Floor, Terrace"
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formActions}>
                <button type="button" className="btn-secondary" onClick={() => setShowFloorModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {editingFloor ? 'Save Changes' : 'Create Floor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CREATE / EDIT TABLE
         ========================================== */}
      {showTableModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <X size={20} className="modal-close" onClick={() => setShowTableModal(false)} />
            <h2>{editingTable ? 'Edit Table Settings' : 'Add Table to Layout'}</h2>
            
            <form onSubmit={handleTableSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Table Number / Code</label>
                <input 
                  type="text" 
                  placeholder="e.g. Table 1, T2"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Seating Capacity</label>
                <input 
                  type="number" 
                  min="1"
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  required
                />
              </div>

              <div style={styles.formGroupCheckbox}>
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={styles.checkbox}
                />
                <label htmlFor="isActive" style={styles.checkboxLabel}>
                  Active (Table is active and accepts orders in POS)
                </label>
              </div>

              <div style={styles.formActions}>
                <button type="button" className="btn-secondary" onClick={() => setShowTableModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {editingTable ? 'Save Changes' : 'Add Table'}
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
  headerActions: {
    display: 'flex',
    gap: '0.75rem'
  },
  topBtn: {
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
  emptyLayout: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    color: '#6f6f76',
    backgroundColor: '#1a1a1e',
    borderRadius: '12px',
    border: '1px solid #2e2e36'
  },
  layoutArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  floorTabsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #2e2e36',
    paddingBottom: '0.5rem'
  },
  tabsList: {
    display: 'flex',
    gap: '0.5rem'
  },
  floorTab: {
    padding: '0.5rem 1.25rem',
    color: '#a0a0ab',
    fontSize: '0.95rem',
    fontWeight: 600
  },
  floorTabActive: {
    color: '#ffffff',
    borderBottom: '3px solid var(--color-primary)'
  },
  floorActions: {
    display: 'flex',
    gap: '1rem'
  },
  floorSubActionBtn: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#a0a0ab',
    backgroundColor: '#232329',
    padding: '0.4rem 0.75rem',
    border: '1px solid #2e2e36'
  },
  tablesTableContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  tablesListTitle: {
    fontSize: '1.1rem',
    fontWeight: 600
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
    fontSize: '0.85rem',
    fontWeight: 500
  },
  
  // Forms
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

export default AdminTableView;
