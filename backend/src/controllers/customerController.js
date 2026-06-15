// =========================================================================
// CUSTOMER CONTROLLER
// Purpose: Handles CRUD logic for customers, including lookup/search features.
// Used in: backend/src/routes/customerRoutes.js
// =========================================================================

const Customer = require('../models/Customer');
const { Op } = require('sequelize');

// Handler: getCustomers
// Purpose: Lists all customers or filters them by a search query (name, email, phone).
// Routed from: GET /api/customers (POS customer search lookup)
exports.getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = {};

    // Check if a search query parameter is present (lookup by partial name, email, or phone)
    if (search) {
      whereClause = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const customers = await Customer.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });
    
    res.status(200).json(customers);
  } catch (error) {
    console.error('[Customer Controller] GetCustomers Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: createCustomer
// Purpose: Adds a customer profile from the POS screen.
// Routed from: POST /api/customers (POS add customer modal)
exports.createCustomer = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    const newCustomer = await Customer.create({ name, email, phone });
    res.status(201).json({
      message: 'Customer created successfully',
      customer: newCustomer
    });
  } catch (error) {
    console.error('[Customer Controller] CreateCustomer Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: updateCustomer
// Purpose: Modifies customer profile details.
// Routed from: PUT /api/customers/:id
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (name) customer.name = name;
    if (email !== undefined) customer.email = email;
    if (phone !== undefined) customer.phone = phone;

    await customer.save();
    res.status(200).json({
      message: 'Customer profile updated successfully',
      customer
    });
  } catch (error) {
    console.error('[Customer Controller] UpdateCustomer Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: deleteCustomer
// Purpose: Deletes a customer.
// Routed from: DELETE /api/customers/:id
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await customer.destroy();
    res.status(200).json({ message: 'Customer profile deleted successfully' });
  } catch (error) {
    console.error('[Customer Controller] DeleteCustomer Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
