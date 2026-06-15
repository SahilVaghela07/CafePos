// =========================================================================
// USER & EMPLOYEE MANAGEMENT ROUTES (ADMIN ONLY)
// Purpose: Protects endpoints for listing, adding, modifying, and deactivating cashier accounts.
// Used in: backend/src/server.js to register user management routing.
// =========================================================================

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Apply protection middleware to all user-management routes
// Purpose: Ensures only logged-in users with 'Admin' credentials can execute these actions.
router.use(protect);
router.use(adminOnly);

// Route: Get all users
// Method: GET /api/users
router.get('/', userController.getUsers);

// Route: Create a new user account
// Method: POST /api/users
router.post('/', userController.createUser);

// Route: Change password for a specific employee
// Method: PUT /api/users/:id/change-password
router.put('/:id/change-password', userController.changePassword);

// Route: Toggle archive/deactivation state for an employee
// Method: PUT /api/users/:id/archive
router.put('/:id/archive', userController.toggleArchiveUser);

// Route: Permanently delete an employee account
// Method: DELETE /api/users/:id
router.delete('/:id', userController.deleteUser);

module.exports = router;
