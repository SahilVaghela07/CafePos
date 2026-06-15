// =========================================================================
// KITCHEN DISPLAY SYSTEM (KDS) VIEW
// Purpose: Renders live order tickets in a responsive grid, allowing kitchen
//          staff to strike through cooked items and transition ticket stages.
// Used in: Accessed via URL Hash (#kds) or the navigation menu.
// =========================================================================

import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, RefreshCw, Flame, Clock, Filter, Eye } from 'lucide-react';
import api from '../services/api';
import { connectWebSocket, subscribeToWs } from '../services/websocket';

const KdsView = () => {
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Initial Load: Connect websocket and fetch active tickets
  useEffect(() => {
    connectWebSocket();
    fetchKdsData();

    // Subscribe to live WebSocket notifications from server
    // Purpose: When a cashier places an order or changes payment status, the KDS refreshes in real-time.
    const unsubscribe = subscribeToWs((message) => {
      console.log('[KDS WebSocket Event Handler]:', message);
      // Reload tickets list on key POS events
      if (['ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_PAID', 'KDS_STATUS_CHANGED', 'KDS_ITEM_TOGGLED'].includes(message.event)) {
        fetchKdsData();
      }
    });

    // Clean up websocket listener subscription on unmount
    return () => unsubscribe();
  }, []);

  const fetchKdsData = async () => {
    setLoading(true);
    try {
      const allOrders = await api.orders.getOrders();
      const cats = await api.categories.getCategories();
      
      // Filter out 'Paid' orders that are already marked 'Completed' in KDS
      // Purpose: Only display orders currently in prep queue (To Cook, Preparing) or recently completed.
      const activeTickets = allOrders.filter(
        o => o.status !== 'Cancelled' && !(o.status === 'Paid' && o.kdsStatus === 'Completed')
      );
      
      // Fetch full details (with items list) for each active order
      const detailedTickets = await Promise.all(
        activeTickets.map(ticket => api.orders.getOrderDetails(ticket.id))
      );

      setOrders(detailedTickets);
      setCategories(cats);
      setError('');
    } catch (err) {
      setError('Error loading KDS tickets list');
    } finally {
      setLoading(false);
    }
  };

  // 2. KDS Ticket Stage Transitions
  const handleAdvanceStage = async (order) => {
    let nextStatus = '';
    if (order.kdsStatus === 'To Cook') {
      nextStatus = 'Preparing';
    } else if (order.kdsStatus === 'Preparing') {
      nextStatus = 'Completed';
    } else {
      return; // Already completed
    }

    try {
      await api.orders.updateKdsStatus(order.id, nextStatus);
      fetchKdsData(); // Reload list
    } catch (err) {
      setError('Failed to update KDS ticket stage.');
    }
  };

  // 3. Toggle Strikethrough for Individual Item
  const handleToggleItem = async (e, itemId) => {
    e.stopPropagation(); // Prevent card click (which triggers stage advancement)
    try {
      await api.orders.toggleKdsItem(itemId);
      fetchKdsData();
    } catch (err) {
      setError('Failed to update item prep state.');
    }
  };

  // 4. Counts for header stats
  const toCookCount = orders.filter(o => o.kdsStatus === 'To Cook').length;
  const preparingCount = orders.filter(o => o.kdsStatus === 'Preparing').length;
  const completedCount = orders.filter(o => o.kdsStatus === 'Completed').length;

  // 5. Apply category filter
  const filteredOrders = orders.filter(order => {
    if (activeCategoryFilter === 'All') return true;
    
    // Check if the order contains at least one item from the selected category filter
    return order.items.some(
      item => item.product?.categoryId === activeCategoryFilter
    );
  });

  return (
    <div style={styles.container}>
      {/* KDS Header bar */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.kdsBadge}>KDS</div>
          <h1 style={styles.title}>Kitchen Display System</h1>
          <button style={styles.refreshBtn} onClick={fetchKdsData}>
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Counter Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <span style={{...styles.statDot, backgroundColor: 'var(--color-primary)'}}></span>
            <span>To Cook: <strong>{toCookCount}</strong></span>
          </div>
          <div style={styles.statCard}>
            <span style={{...styles.statDot, backgroundColor: 'var(--color-warning)'}}></span>
            <span>Preparing: <strong>{preparingCount}</strong></span>
          </div>
          <div style={styles.statCard}>
            <span style={{...styles.statDot, backgroundColor: 'var(--color-success-light)'}}></span>
            <span>Completed: <strong>{completedCount}</strong></span>
          </div>
        </div>
      </header>

      {/* Main KDS Area */}
      <div style={styles.workspace}>
        {/* Left Category Filters Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarTitle}>
            <Filter size={16} />
            <span>Filter Category</span>
          </div>
          <div style={styles.filterList}>
            <button
              style={{
                ...styles.filterBtn,
                ...(activeCategoryFilter === 'All' ? styles.filterBtnActive : {})
              }}
              onClick={() => setActiveCategoryFilter('All')}
            >
              All Orders
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                style={{
                  ...styles.filterBtn,
                  ...(activeCategoryFilter === cat.id ? { backgroundColor: cat.color, color: '#ffffff' } : {})
                }}
                onClick={() => setActiveCategoryFilter(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Tickets Grid */}
        <main style={styles.ticketGridContainer}>
          {error && <div style={styles.errorAlert}>{error}</div>}
          
          {filteredOrders.length === 0 ? (
            <div style={styles.emptyKds}>
              <Flame size={64} style={{ opacity: 0.15, marginBottom: '1rem' }} />
              <h3>No Active Kitchen Tickets</h3>
              <p>New orders sent from POS terminals will appear here in real-time.</p>
            </div>
          ) : (
            <div style={styles.ticketsGrid}>
              {filteredOrders.map(order => {
                // Calculate elapsed time in minutes since ticket creation
                const elapsedMin = Math.floor(
                  (new Date() - new Date(order.createdAt)) / 60000
                );
                
                return (
                  <div 
                    key={order.id} 
                    style={{
                      ...styles.ticketCard,
                      ...(order.kdsStatus === 'Preparing' ? styles.ticketCardPrep : {}),
                      ...(order.kdsStatus === 'Completed' ? styles.ticketCardDone : {})
                    }}
                    onClick={() => handleAdvanceStage(order)}
                  >
                    {/* Ticket Header */}
                    <div style={styles.ticketHeader}>
                      <div>
                        <span style={styles.ticketNo}>{order.orderNumber}</span>
                        <div style={styles.tableName}>Table: {order.table?.tableNumber || 'Takeaway'}</div>
                      </div>
                      <div style={styles.timeBadge}>
                        <Clock size={12} />
                        <span>{elapsedMin}m ago</span>
                      </div>
                    </div>

                    <div style={styles.ticketDivider}></div>

                    {/* Ticket Items List */}
                    <div style={styles.ticketItems}>
                      {order.items.map(item => (
                        <div 
                          key={item.id} 
                          style={{
                            ...styles.itemLine,
                            ...(item.isCompletedInKds ? styles.itemLineStrikethrough : {})
                          }}
                          onClick={(e) => handleToggleItem(e, item.id)}
                        >
                          <span style={styles.itemQty}>{item.quantity}x</span>
                          <span style={styles.itemName}>{item.product?.name}</span>
                          {item.isCompletedInKds && <span style={styles.itemCheck}>✓</span>}
                        </div>
                      ))}
                    </div>

                    {/* Ticket Footer Action Label */}
                    <div style={styles.ticketFooter}>
                      {order.kdsStatus === 'To Cook' && (
                        <div style={{...styles.stageLabel, color: 'var(--color-primary)'}}>
                          <Play size={14} /> Tap to Cook
                        </div>
                      )}
                      {order.kdsStatus === 'Preparing' && (
                        <div style={{...styles.stageLabel, color: 'var(--color-warning)'}}>
                          <Flame size={14} /> Tap to Complete
                        </div>
                      )}
                      {order.kdsStatus === 'Completed' && (
                        <div style={{...styles.stageLabel, color: 'var(--color-success-light)'}}>
                          <CheckCircle size={14} /> Ready to Serve
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
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
    padding: '1rem 2rem',
    backgroundColor: '#1a1a1e',
    borderBottom: '1px solid #2e2e36',
    zIndex: 10
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  kdsBadge: {
    backgroundColor: '#ff5252',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: '0.8rem',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px'
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#ffffff'
  },
  refreshBtn: {
    backgroundColor: '#232329',
    color: '#ffffff',
    padding: '0.5rem',
    borderRadius: '50%'
  },
  statsRow: {
    display: 'flex',
    gap: '1rem'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#232329',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.85rem'
  },
  statDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  workspace: {
    display: 'flex',
    flexGrow: 1,
    overflow: 'hidden'
  },
  sidebar: {
    width: '220px',
    backgroundColor: '#1a1a1e',
    borderRight: '1px solid #2e2e36',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 1rem'
  },
  sidebarTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#6f6f76',
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginBottom: '1rem'
  },
  filterList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  filterBtn: {
    width: '100%',
    padding: '0.6rem 1rem',
    textAlign: 'left',
    backgroundColor: '#232329',
    color: '#a0a0ab',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 500
  },
  filterBtnActive: {
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff'
  },
  ticketGridContainer: {
    flexGrow: 1,
    padding: '2rem',
    overflowY: 'auto'
  },
  errorAlert: {
    backgroundColor: 'rgba(200, 63, 63, 0.15)',
    border: '1px solid #c83f3f',
    color: '#ff5252',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem'
  },
  emptyKds: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80%',
    color: '#6f6f76',
    textAlign: 'center'
  },
  ticketsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1.5rem',
    alignContent: 'start'
  },
  ticketCard: {
    backgroundColor: '#1a1a1e',
    border: '1px solid #2e2e36',
    borderTop: '5px solid var(--color-primary)',
    borderRadius: '12px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '220px',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.15s ease-in-out'
  },
  ticketCardPrep: {
    borderTop: '5px solid var(--color-warning)'
  },
  ticketCardDone: {
    borderTop: '5px solid var(--color-success-light)'
  },
  ticketHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start'
  },
  ticketNo: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#ffffff'
  },
  tableName: {
    fontSize: '0.8rem',
    color: '#a0a0ab',
    marginTop: '0.2rem'
  },
  timeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.7rem',
    backgroundColor: '#232329',
    color: '#ffb74d',
    padding: '0.2rem 0.5rem',
    borderRadius: '10px'
  },
  ticketDivider: {
    borderTop: '1px dashed #2e2e36',
    margin: '0.75rem 0'
  },
  ticketItems: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    marginBottom: '1rem'
  },
  itemLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.95rem',
    cursor: 'pointer',
    padding: '0.2rem',
    borderRadius: '4px'
  },
  itemLineStrikethrough: {
    textDecoration: 'line-through',
    color: '#6f6f76',
    opacity: 0.6
  },
  itemQty: {
    fontWeight: 700,
    color: 'var(--color-primary-hover)'
  },
  itemName: {
    color: '#ffffff'
  },
  itemCheck: {
    marginLeft: 'auto',
    color: 'var(--color-success-light)',
    fontWeight: 'bold',
    fontSize: '0.85rem'
  },
  ticketFooter: {
    borderTop: '1px solid #2e2e36',
    paddingTop: '0.75rem',
    display: 'flex',
    justifyContent: 'center'
  },
  stageLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    textTransform: 'uppercase'
  }
};

export default KdsView;
