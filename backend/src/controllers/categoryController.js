// =========================================================================
// PRODUCT CATEGORY CONTROLLER
// Purpose: Handles CRUD logic for catalog food categories (e.g. Coffee, Deserts).
// Used in: backend/src/routes/categoryRoutes.js
// =========================================================================

const Category = require('../models/Category');

// Handler: getCategories
// Purpose: Lists all food categories.
// Routed from: GET /api/categories (POS sidebar filter, admin list table)
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['name', 'ASC']]
    });
    res.status(200).json(categories);
  } catch (error) {
    console.error('[Category Controller] GetCategories Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: createCategory
// Purpose: Adds a category to the catalog.
// Routed from: POST /api/categories (Admin Category dashboard)
exports.createCategory = async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const categoryExists = await Category.findOne({ where: { name } });
    if (categoryExists) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const newCategory = await Category.create({ name, color });
    res.status(201).json({
      message: 'Category created successfully',
      category: newCategory
    });
  } catch (error) {
    console.error('[Category Controller] CreateCategory Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: updateCategory
// Purpose: Modifies the name or hex color of a category.
// Routed from: PUT /api/categories/:id (Admin Category edit)
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (name) {
      // Check if another category has the same name
      const duplicate = await Category.findOne({ where: { name } });
      if (duplicate && duplicate.id !== category.id) {
        return res.status(400).json({ message: 'Another category exists with this name' });
      }
      category.name = name;
    }
    
    if (color) {
      category.color = color;
    }

    await category.save();
    res.status(200).json({
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    console.error('[Category Controller] UpdateCategory Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: deleteCategory
// Purpose: Removes a category from the database.
// Routed from: DELETE /api/categories/:id
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.destroy();
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('[Category Controller] DeleteCategory Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
