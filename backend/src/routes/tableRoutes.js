// =========================================================================
// FLOOR & TABLE ROUTING
// Purpose: Declares endpoints for floor layout configuration and POS table view retrieval.
// Used in: backend/src/server.js to register table routing.
// =========================================================================

const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Route: Get floors and active tables (accessible by any cashier/admin to display floor layout popup)
// Method: GET /api/tables/floors
router.get('/floors', protect, tableController.getFloors);

// Route: Get all floors and tables including inactive ones (restricted to Admins for layout design)
// Method: GET /api/tables/admin
router.get('/admin', protect, adminOnly, tableController.getAllFloorsAndTables);

// Route: Admin Floor Operations
// Method: POST /api/tables/floors (Create Floor)
router.post('/floors', protect, adminOnly, tableController.createFloor);

// Method: PUT /api/tables/floors/:id (Update Floor name)
router.put('/floors/:id', protect, adminOnly, tableController.updateFloor);

// Method: DELETE /api/tables/floors/:id (Delete Floor and tables under it)
router.delete('/floors/:id', protect, adminOnly, tableController.deleteFloor);

// Route: Admin Table Operations
// Method: POST /api/tables (Create Table under a Floor)
router.post('/', protect, adminOnly, tableController.createTable);

// Method: PUT /api/tables/:id (Update Table number, seats, active status)
router.put('/:id', protect, adminOnly, tableController.updateTable);

// Method: DELETE /api/tables/:id (Delete Table)
router.delete('/:id', protect, adminOnly, tableController.deleteTable);

module.exports = router;
