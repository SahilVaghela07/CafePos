// =========================================================================
// PUBLIC AUTHENTICATION ROUTES
// Purpose: Handles login and registration endpoints for cashiers and admin users.
// Used in: backend/src/server.js to register auth routing.
// =========================================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route: Sign up new user
// Purpose: Accessed by the Admin signup view or on initial deployment to register the primary admin.
// Method: POST /api/auth/signup
router.post('/signup', authController.signup);

// Route: User login
// Purpose: Accessed by cashiers/admins on the unified Login interface.
// Method: POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;
