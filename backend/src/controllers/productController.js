// =========================================================================
// PRODUCT CONTROLLER
// Purpose: Handles CRUD logic for products, including inline category creation.
// Used in: backend/src/routes/productRoutes.js
// =========================================================================

const Product = require('../models/Product');
const Category = require('../models/Category');

// Handler: getProducts
// Purpose: Retrieves all products, including their associated category details.
// Routed from: GET /api/products (POS product catalog grid, Admin dashboard inventory table)
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color']
      }],
      order: [['name', 'ASC']]
    });
    res.status(200).json(products);
  } catch (error) {
    console.error('[Product Controller] GetProducts Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: createProduct
// Purpose: Creates a new product. Supports creating a category on-the-fly inline.
// Routed from: POST /api/products (Admin product creation form)
exports.createProduct = async (req, res) => {
  try {
    const { name, price, uom, tax, description, categoryId, newCategoryName, newCategoryColor } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: 'Product name and price are required' });
    }

    let finalCategoryId = categoryId;

    // Feature: On-the-fly category creation.
    // Purpose: If the admin typed a new category name inline, create the Category record
    // and assign its new ID to the product before saving.
    if (!finalCategoryId && newCategoryName) {
      let category = await Category.findOne({ where: { name: newCategoryName } });
      if (!category) {
        category = await Category.create({
          name: newCategoryName,
          color: newCategoryColor || '#b52b2b'
        });
      }
      finalCategoryId = category.id;
    }

    if (!finalCategoryId) {
      return res.status(400).json({ message: 'Product must belong to a category' });
    }

    const newProduct = await Product.create({
      name,
      price,
      uom: uom || 'pcs',
      tax: tax || 5.0,
      description,
      categoryId: finalCategoryId
    });

    // Retrieve the fully created product containing category details
    const productWithCategory = await Product.findByPk(newProduct.id, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color']
      }]
    });

    res.status(201).json({
      message: 'Product created successfully',
      product: productWithCategory
    });
  } catch (error) {
    console.error('[Product Controller] CreateProduct Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: updateProduct
// Purpose: Updates an existing product, supporting category swap or inline creation.
// Routed from: PUT /api/products/:id (Admin product edit form)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, uom, tax, description, categoryId, newCategoryName, newCategoryColor } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let finalCategoryId = categoryId;

    // Feature: On-the-fly category creation during update
    if (!finalCategoryId && newCategoryName) {
      let category = await Category.findOne({ where: { name: newCategoryName } });
      if (!category) {
        category = await Category.create({
          name: newCategoryName,
          color: newCategoryColor || '#b52b2b'
        });
      }
      finalCategoryId = category.id;
    }

    // Update product fields if provided
    if (name) product.name = name;
    if (price !== undefined) product.price = price;
    if (uom) product.uom = uom;
    if (tax !== undefined) product.tax = tax;
    if (description !== undefined) product.description = description;
    if (finalCategoryId) product.categoryId = finalCategoryId;

    await product.save();

    const productWithCategory = await Product.findByPk(product.id, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'color']
      }]
    });

    res.status(200).json({
      message: 'Product updated successfully',
      product: productWithCategory
    });
  } catch (error) {
    console.error('[Product Controller] UpdateProduct Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: deleteProduct
// Purpose: Deletes a product.
// Routed from: DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.destroy();
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('[Product Controller] DeleteProduct Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
