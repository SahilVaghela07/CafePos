// =========================================================================
// AUTHENTICATION VIEW (LOGIN & SIGNUP PANELS)
// Purpose: Renders side-by-side or toggled forms for user signup and login.
// Used in: frontend/src/App.jsx when no active JWT session exists.
// =========================================================================

import React, { useState } from 'react';
import { LogIn, UserPlus, Shield, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

const LoginSignup = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Signup panels
  const [showPassword, setShowPassword] = useState(false);
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee'); // Default signup role is Employee (Cashier)
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (isLogin) {
        // Authenticate credentials against backend REST API
        data = await api.auth.login(email, password);
      } else {
        // Create new cashier/admin account
        data = await api.auth.signup(name, email, password, role);
      }

      // Persist credentials locally
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      console.log('[Auth Success] Session initialized for:', data.user.name);
      
      // Trigger callback in App.jsx to unlock views
      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.brandSection}>
          <div style={styles.logoCircle}>odoo</div>
          <h1 style={styles.brandTitle}>Cafe POS</h1>
          <p style={styles.brandSubtitle}>Restaurant Point-of-Sale System</p>
        </div>

        {/* Form panel header */}
        <div style={styles.toggleHeader}>
          <button 
            style={{...styles.toggleBtn, ...(isLogin ? styles.toggleBtnActive : {})}} 
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            <LogIn size={18} /> Login
          </button>
          <button 
            style={{...styles.toggleBtn, ...(!isLogin ? styles.toggleBtnActive : {})}} 
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            <UserPlus size={18} /> Sign Up
          </button>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Sign Up Fields */}
          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input 
                type="text" 
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              type="email" 
              placeholder="e.g. john@cafe.pos"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.passwordInput}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Role selection only on Signup */}
          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Requested Role</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={styles.select}
              >
                <option value="Employee">Employee (POS Cashier)</option>
                <option value="Admin">Admin (Backend Manager)</option>
              </select>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="btn-primary" 
            style={styles.submitBtn}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={styles.footer}>
          <Shield size={14} style={{ marginRight: 4 }} />
          <span>Secure authentication layer</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#121214',
    padding: '1.5rem'
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#1a1a1e',
    border: '1px solid #2e2e36',
    borderRadius: '16px',
    padding: '2.5rem 2rem',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)'
  },
  brandSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  logoCircle: {
    backgroundColor: '#7c5dfa',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.75rem',
    boxShadow: '0 4px 12px rgba(124, 93, 250, 0.3)'
  },
  brandTitle: {
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.2
  },
  brandSubtitle: {
    fontSize: '0.85rem',
    color: '#a0a0ab',
    marginTop: '0.25rem'
  },
  toggleHeader: {
    display: 'flex',
    backgroundColor: '#232329',
    padding: '4px',
    borderRadius: '10px',
    marginBottom: '1.5rem'
  },
  toggleBtn: {
    flex: 1,
    padding: '0.6rem',
    borderRadius: '8px',
    color: '#a0a0ab',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem'
  },
  toggleBtnActive: {
    backgroundColor: '#1a1a1e',
    color: '#ffffff',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
  },
  errorAlert: {
    backgroundColor: 'rgba(200, 63, 63, 0.15)',
    border: '1px solid #c83f3f',
    color: '#ff5252',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    marginBottom: '1.5rem',
    fontWeight: 500
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#a0a0ab'
  },
  input: {
    width: '100%'
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  passwordInput: {
    width: '100%',
    paddingRight: '3rem'
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.75rem',
    color: '#6f6f76',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.25rem'
  },
  select: {
    width: '100%'
  },
  submitBtn: {
    marginTop: '0.5rem',
    width: '100%',
    padding: '0.85rem'
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6f6f76',
    fontSize: '0.75rem',
    marginTop: '1.5rem'
  }
};

export default LoginSignup;
