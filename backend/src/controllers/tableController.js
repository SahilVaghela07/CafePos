// =========================================================================
// FLOOR PLAN & TABLE CONTROLLER
// Purpose: Handles setup and retrieval of restaurant layout: Floors and Tables.
// Used in: backend/src/routes/tableRoutes.js
// =========================================================================

const Floor = require('../models/Floor');
const Table = require('../models/Table');

// ==========================================
// FLOOR HANDLERS
// ==========================================

// Handler: getFloors
// Purpose: Returns all floors and their active tables.
// Routed from: GET /api/tables/floors (POS Floor Pop-up table selector grid)
exports.getFloors = async (req, res) => {
  try {
    const floors = await Floor.findAll({
      include: [{
        model: Table,
        as: 'tables',
        where: { isActive: true }, // POS only needs active tables. We can support all tables in dashboard.
        required: false
      }],
      order: [['name', 'ASC'], [{ model: Table, as: 'tables' }, 'tableNumber', 'ASC']]
    });
    res.status(200).json(floors);
  } catch (error) {
    console.error('[Table Controller] GetFloors Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: getAllFloorsAndTables
// Purpose: Returns ALL floors and ALL tables (active and inactive) for admin management.
// Routed from: GET /api/tables/admin
exports.getAllFloorsAndTables = async (req, res) => {
  try {
    const floors = await Floor.findAll({
      include: [{
        model: Table,
        as: 'tables',
        required: false
      }],
      order: [['name', 'ASC']]
    });
    res.status(200).json(floors);
  } catch (error) {
    console.error('[Table Controller] GetAllFloorsAndTables Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: createFloor
// Purpose: Creates a new dining floor.
// Routed from: POST /api/tables/floors (Admin Layout Setup)
exports.createFloor = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Floor name is required' });
    }

    const floorExists = await Floor.findOne({ where: { name } });
    if (floorExists) {
      return res.status(400).json({ message: 'Floor already exists' });
    }

    const newFloor = await Floor.create({ name });
    res.status(201).json({
      message: 'Floor created successfully',
      floor: newFloor
    });
  } catch (error) {
    console.error('[Table Controller] CreateFloor Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: updateFloor
// Purpose: Renames a floor.
// Routed from: PUT /api/tables/floors/:id
exports.updateFloor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const floor = await Floor.findByPk(id);
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }

    if (name) floor.name = name;
    await floor.save();

    res.status(200).json({
      message: 'Floor updated successfully',
      floor
    });
  } catch (error) {
    console.error('[Table Controller] UpdateFloor Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: deleteFloor
// Purpose: Deletes a floor. Note that tables under this floor will be orphaned or deleted.
// Routed from: DELETE /api/tables/floors/:id
exports.deleteFloor = async (req, res) => {
  try {
    const { id } = req.params;

    const floor = await Floor.findByPk(id);
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }

    // Delete associated tables first or let DB constraints handle it
    await Table.destroy({ where: { floorId: id } });
    await floor.destroy();

    res.status(200).json({ message: 'Floor and all its tables deleted successfully' });
  } catch (error) {
    console.error('[Table Controller] DeleteFloor Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ==========================================
// TABLE HANDLERS
// ==========================================

// Handler: createTable
// Purpose: Creates a table under a specific floor.
// Routed from: POST /api/tables (Admin Floor Layout designer)
exports.createTable = async (req, res) => {
  try {
    const { tableNumber, seats, floorId, isActive } = req.body;

    if (!tableNumber || !seats || !floorId) {
      return res.status(400).json({ message: 'Table number, seats and floor ID are required' });
    }

    const floor = await Floor.findByPk(floorId);
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }

    const newTable = await Table.create({
      tableNumber,
      seats,
      floorId,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      message: 'Table created successfully',
      table: newTable
    });
  } catch (error) {
    console.error('[Table Controller] CreateTable Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: updateTable
// Purpose: Edits table number, seat capacity, or active toggle.
// Routed from: PUT /api/tables/:id (Admin edit table modal)
exports.updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { tableNumber, seats, isActive, floorId } = req.body;

    const table = await Table.findByPk(id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    if (floorId) {
      const floor = await Floor.findByPk(floorId);
      if (!floor) return res.status(404).json({ message: 'Floor not found' });
      table.floorId = floorId;
    }

    if (tableNumber) table.tableNumber = tableNumber;
    if (seats !== undefined) table.seats = seats;
    if (isActive !== undefined) table.isActive = isActive;

    await table.save();

    res.status(200).json({
      message: 'Table updated successfully',
      table
    });
  } catch (error) {
    console.error('[Table Controller] UpdateTable Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: deleteTable
// Purpose: Deletes a table.
// Routed from: DELETE /api/tables/:id
exports.deleteTable = async (req, res) => {
  try {
    const { id } = req.params;

    const table = await Table.findByPk(id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    await table.destroy();
    res.status(200).json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('[Table Controller] DeleteTable Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
