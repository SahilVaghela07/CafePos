// =========================================================================
// AUTHENTICATION MIDDLEWARE
// Purpose: Protects endpoints by verifying JWT tokens and role-based permissions.
// Used in: backend/src/routes/ to guard admin-only or employee routes.
// =========================================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforcafe-pos-2026';

// Middleware: protect
// Purpose: Restricts route access to logged-in users only by verifying the JWT token.
// Where it's used: Wrapped around POS and Backend Admin endpoints.
const protect = async (req, res, next) => {
  let token;
  
  // Check for Token in the Authorization Request Header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract the raw token string (excluding the 'Bearer ' prefix)
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token authenticity and expiration
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Find the user associated with this token, excluding the hashed password from the object
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      
      if (user.isArchived) {
        return res.status(403).json({ message: 'This account has been archived/deactivated' });
      }
      
      // Attach the retrieved user object to the request context
      req.user = user;
      next(); // Continue execution to the route controller
    } catch (error) {
      console.error('[Auth Middleware] JWT Verification Error:', error);
      return res.status(401).json({ message: 'Not authorized, token verification failed' });
    }
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// Middleware: adminOnly
// Purpose: Restricts route access to users with 'Admin' role (User role in backend portal).
// Where it's used: Wrapped around backend configuration tables (Products, Category, etc.).
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin role required' });
  }
};

module.exports = { protect, adminOnly };
