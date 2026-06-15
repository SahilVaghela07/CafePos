// =========================================================================
// CENTRAL ROUTER & SHELL COMPROLLER (App.jsx)
// Purpose: Orchestrates sidebar navigation drawers, user sessions, role-based
//          security guards, URL hash routers (#kds), and view mounts.
// Used in: frontend/src/main.jsx
// =========================================================================

import React, { useState, useEffect } from 'react';
import { 
  Coffee, ShieldAlert, LogOut, ShoppingCart, Clock, Users, Tag, 
  Layers, Settings, BarChart2, FolderKanban, Menu, X 
} from 'lucide-react';

// Import Views
import LoginSignup from './views/LoginSignup';
import PosTerminalView from './views/PosTerminalView';
import KdsView from './views/KdsView';
import OrdersHistoryView from './views/OrdersHistoryView';
import CustomerManagementView from './views/CustomerManagementView';
import AdminCategoryView from './views/AdminCategoryView';
import AdminProductView from './views/AdminProductView';
import AdminTableView from './views/AdminTableView';
import AdminPromotionView from './views/AdminPromotionView';
import AdminUserView from './views/AdminUserView';
import AdminReportView from './views/AdminReportView';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('login'); // login | signup | pos | orders | customers | kds | admin-...
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1. URL Hash Router on boot
  // Purpose: Checks if the URL hash is #kds (e.g. accessed on a wall tablet in the kitchen).
  //          If so, immediately loads the Kitchen Display View without requiring authentication.
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#kds') {
        setCurrentView('kds');
      } else {
        checkSession();
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Run check on boot

    // Listener for session expiration redirects from api.js
    window.addEventListener('auth-change', checkSession);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('auth-change', checkSession);
    };
  }, []);

  // Check if session token and user profile is saved locally
  const checkSession = () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (window.location.hash === '#kds') {
      setCurrentView('kds');
    } else if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      // Admin defaults to products config list, Employee/Cashier defaults to POS terminal
      setCurrentView(parsedUser.role === 'Admin' ? 'admin-products' : 'pos');
    } else {
      setUser(null);
      setCurrentView('login');
    }
  };

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setCurrentView(authenticatedUser.role === 'Admin' ? 'admin-products' : 'pos');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentView('login');
    window.location.hash = ''; // Clear KDS hash if set
  };

  const handleEditOrderRedirect = (order) => {
    // Purpose: Redirection callback used in OrdersHistoryView. 
    // Redirects cashier back to the POS order taking cart screen.
    // The POS Order terminal automatically reads the table's active draft order from database.
    setCurrentView('pos');
  };

  // Render active view component
  const renderActiveView = () => {
    switch (currentView) {
      case 'login':
        return <LoginSignup onAuthSuccess={handleAuthSuccess} />;
      case 'pos':
        return <PosTerminalView user={user} onLogout={handleLogout} />;
      case 'orders':
        return <OrdersHistoryView onEditOrder={handleEditOrderRedirect} />;
      case 'customers':
        return <CustomerManagementView user={user} />;
      case 'kds':
        return <KdsView />;
      case 'admin-categories':
        return <AdminCategoryView />;
      case 'admin-products':
        return <AdminProductView />;
      case 'admin-tables':
        return <AdminTableView />;
      case 'admin-promotions':
        return <AdminPromotionView />;
      case 'admin-users':
        return <AdminUserView />;
      case 'admin-reports':
        return <AdminReportView />;
      default:
        return <div style={{ padding: '2rem' }}>View not found.</div>;
    }
  };

  // 2. Routing Condition: Non-authenticated page frame
  if (currentView === 'login' || currentView === 'signup') {
    return renderActiveView();
  }

  // 3. Routing Condition: KDS direct hash link (no sidebar wrapper)
  if (currentView === 'kds' && window.location.hash === '#kds') {
    return renderActiveView();
  }

  return (
    <div className="app-container">
      
      {/* ==========================================
          SIDEBAR NAVIGATION DRAWER
         ========================================== */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <Coffee size={24} style={{ color: 'var(--color-primary)' }} />
          <span>Cafe POS Shell</span>
        </div>

        <ul className="sidebar-menu">
          {/* 1. Cashier POS menu routes (accessible by both Cashiers and Admins) */}
          <li>
            <a 
              href="#pos" 
              className={`sidebar-link ${currentView === 'pos' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); setCurrentView('pos'); }}
            >
              <ShoppingCart size={18} /> POS Order
            </a>
          </li>
          <li>
            <a 
              href="#orders" 
              className={`sidebar-link ${currentView === 'orders' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); setCurrentView('orders'); }}
            >
              <Clock size={18} /> Orders History
            </a>
          </li>
          <li>
            <a 
              href="#customers" 
              className={`sidebar-link ${currentView === 'customers' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); setCurrentView('customers'); }}
            >
              <Users size={18} /> Customers
            </a>
          </li>
          <li>
            <a 
              href="#kds" 
              className={`sidebar-link ${currentView === 'kds' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); setCurrentView('kds'); }}
            >
              <FolderKanban size={18} /> KDS Screen
            </a>
          </li>

          {/* 2. Admin System Configuration modules (restricted to Admins only) */}
          {user && user.role === 'Admin' && (
            <>
              <div style={styles.menuDivider}>Admin Panel</div>
              <li>
                <a 
                  href="#admin-products" 
                  className={`sidebar-link ${currentView === 'admin-products' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setCurrentView('admin-products'); }}
                >
                  <Coffee size={18} /> Menu Products
                </a>
              </li>
              <li>
                <a 
                  href="#admin-categories" 
                  className={`sidebar-link ${currentView === 'admin-categories' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setCurrentView('admin-categories'); }}
                >
                  <Settings size={18} /> Menu Categories
                </a>
              </li>
              <li>
                <a 
                  href="#admin-tables" 
                  className={`sidebar-link ${currentView === 'admin-tables' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setCurrentView('admin-tables'); }}
                >
                  <Layers size={18} /> Floor Plan layout
                </a>
              </li>
              <li>
                <a 
                  href="#admin-promotions" 
                  className={`sidebar-link ${currentView === 'admin-promotions' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setCurrentView('admin-promotions'); }}
                >
                  <Tag size={18} /> Coupons & Promos
                </a>
              </li>
              <li>
                <a 
                  href="#admin-users" 
                  className={`sidebar-link ${currentView === 'admin-users' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setCurrentView('admin-users'); }}
                >
                  <Users size={18} /> User/Employee
                </a>
              </li>
              <li>
                <a 
                  href="#admin-reports" 
                  className={`sidebar-link ${currentView === 'admin-reports' ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setCurrentView('admin-reports'); }}
                >
                  <BarChart2 size={18} /> Dashboard Reports
                </a>
              </li>
            </>
          )}
        </ul>

        {/* Sidebar Footer Log-Out */}
        <div className="sidebar-footer">
          <button 
            style={styles.logoutBtn} 
            onClick={handleLogout}
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main content display canvas */}
      <div style={{ flexGrow: 1, overflowY: 'auto', height: '100vh' }}>
        {renderActiveView()}
      </div>
    </div>
  );
}

const styles = {
  menuDivider: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#6f6f76',
    letterSpacing: '0.05em',
    marginTop: '1.5rem',
    marginBottom: '0.5rem',
    paddingLeft: '0.5rem'
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#ff5252',
    fontWeight: 600,
    fontSize: '0.9rem',
    width: '100%',
    padding: '0.75rem 1rem',
    textAlign: 'left'
  }
};

export default App;
