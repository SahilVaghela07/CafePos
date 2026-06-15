// =========================================================================
// DATABASE SEED SCRIPT
// Purpose: Seeds initial mock data (Users, Categories, Products, Floors, Tables,
// Coupons, and Customers) for local development and testing.
// Used in: Run manually via command line (node src/seed.js) to initialize database.
// =========================================================================

const sequelize = require('./config/db');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Floor = require('./models/Floor');
const Table = require('./models/Table');
const Promotion = require('./models/Promotion');
const Customer = require('./models/Customer');

const mysql = require('mysql2/promise');

const seedDatabase = async () => {
  try {
    // Auto-create MySQL database schema if it doesn't exist yet
    if (process.env.DB_DIALECT === 'mysql') {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || ''
      });
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'CafePOS'}\`;`);
      await connection.end();
      console.log(`[Seed] Ensured MySQL database "${process.env.DB_NAME || 'CafePOS'}" exists.`);
    }

    // 1. Sync database (forces creation of database file and drops old tables to start fresh)
    await sequelize.sync({ force: true });
    console.log('[Seed] Database schemas forced/synced successfully.');

    // 2. Seed Users & Employees
    // Hashing runs automatically in the User model hook beforeCreate
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@cafe.pos',
      password: 'admin123',
      role: 'Admin'
    });

    const cashier = await User.create({
      name: 'John Cashier',
      email: 'john@cafe.pos',
      password: 'cashier123',
      role: 'Employee'
    });

    console.log('[Seed] Users seeded successfully:');
    console.log(` - Admin: admin@cafe.pos / admin123`);
    console.log(` - Cashier: john@cafe.pos / cashier123`);

    // 3. Seed Categories (with distinct colors mapped to mockups)
    const coffeeCat = await Category.create({ name: 'Coffee', color: '#8B4513' });
    const teaCat = await Category.create({ name: 'Tea', color: '#228B22' });
    const donutCat = await Category.create({ name: 'Donut', color: '#FF69B4' });
    const pastryCat = await Category.create({ name: 'Pastry', color: '#D2691E' });
    const dessertCat = await Category.create({ name: 'Dessert', color: '#BA55D3' });

    console.log('[Seed] Menu categories seeded.');

    // 4. Seed Products
    const espresso = await Product.create({
      name: 'Espresso',
      price: 2.50,
      uom: 'pcs',
      tax: 5.0,
      description: 'Rich dark espresso double shot.',
      categoryId: coffeeCat.id
    });

    const cappuccino = await Product.create({
      name: 'Cappuccino',
      price: 3.50,
      uom: 'pcs',
      tax: 5.0,
      description: 'Espresso with steamed milk foam.',
      categoryId: coffeeCat.id
    });

    const masalaTea = await Product.create({
      name: 'Masala Tea',
      price: 2.00,
      uom: 'pcs',
      tax: 5.0,
      description: 'Traditional spiced milk tea.',
      categoryId: teaCat.id
    });

    const greenTea = await Product.create({
      name: 'Green Tea',
      price: 2.20,
      uom: 'pcs',
      tax: 5.0,
      description: 'Healthy brewed green tea leaves.',
      categoryId: teaCat.id
    });

    const chocochipDonut = await Product.create({
      name: 'Chocochip Donut',
      price: 2.50,
      uom: 'pcs',
      tax: 8.0,
      description: 'Sweet donut with chocolate chips sprinkles.',
      categoryId: donutCat.id
    });

    const glazedDonut = await Product.create({
      name: 'Glazed Donut',
      price: 2.00,
      uom: 'pcs',
      tax: 8.0,
      description: 'Classic sugar-glazed donut.',
      categoryId: donutCat.id
    });

    const croissant = await Product.create({
      name: 'Butter Croissant',
      price: 3.00,
      uom: 'pcs',
      tax: 5.0,
      description: 'Warm flaky French butter pastry.',
      categoryId: pastryCat.id
    });

    const chocolatePastry = await Product.create({
      name: 'Chocolate Pastry',
      price: 3.50,
      uom: 'pcs',
      tax: 5.0,
      description: 'Rich dark chocolate layered cake slice.',
      categoryId: pastryCat.id
    });

    const brownie = await Product.create({
      name: 'Choco Fudge Brownie',
      price: 4.00,
      uom: 'pcs',
      tax: 8.0,
      description: 'Decadent chocolate fudge brownie.',
      categoryId: dessertCat.id
    });

    console.log('[Seed] Menu products seeded.');

    // 5. Seed Floors and Tables
    const floor1 = await Floor.create({ name: 'Floor 1' });
    const floor2 = await Floor.create({ name: 'Floor 2' });

    // Floor 1 tables
    await Table.create({ tableNumber: 'Table 1', seats: 2, floorId: floor1.id });
    await Table.create({ tableNumber: 'Table 2', seats: 4, floorId: floor1.id });
    await Table.create({ tableNumber: 'Table 3', seats: 4, floorId: floor1.id });
    await Table.create({ tableNumber: 'Table 4', seats: 6, floorId: floor1.id });

    // Floor 2 tables
    await Table.create({ tableNumber: 'Table 5', seats: 2, floorId: floor2.id });
    await Table.create({ tableNumber: 'Table 6', seats: 4, floorId: floor2.id });
    await Table.create({ tableNumber: 'Table 7', seats: 4, floorId: floor2.id });
    await Table.create({ tableNumber: 'Table 8', seats: 8, floorId: floor2.id });

    console.log('[Seed] Floor plans and tables seeded.');

    // 6. Seed Coupons and Promotions
    // Coupon: Manual code "CAFE10" (10% off entire order)
    await Promotion.create({
      name: 'Grand Opening 10%',
      type: 'Coupon',
      code: 'CAFE10',
      applyOn: 'Order',
      discountType: 'Percentage',
      discountValue: 10.00
    });

    // Coupon: Manual code "FIXED15" ($15 off order)
    await Promotion.create({
      name: 'VIP discount $15',
      type: 'Coupon',
      code: 'FIXED15',
      applyOn: 'Order',
      discountType: 'Fixed',
      discountValue: 15.00
    });

    // Automated Promo: Buy >= 3 Chocochip Donuts and get 20% off
    await Promotion.create({
      name: 'Donut Party Deal (3+ Qty)',
      type: 'Automated',
      applyOn: 'Product',
      productId: chocochipDonut.id,
      minQuantity: 3,
      discountType: 'Percentage',
      discountValue: 20.00
    });

    // Automated Promo: Spend >= $50 on order and get $5 off total bill
    await Promotion.create({
      name: 'Big Spender $5 Deal',
      type: 'Automated',
      applyOn: 'Order',
      minOrderAmount: 50.00,
      discountType: 'Fixed',
      discountValue: 5.00
    });

    console.log('[Seed] Coupons & Promotions rules seeded.');

    // 7. Seed Customers
    await Customer.create({ name: 'Alice Smith', email: 'alice@gmail.com', phone: '1234567890' });
    await Customer.create({ name: 'Bob Johnson', email: 'bob@gmail.com', phone: '9876543210' });

    console.log('[Seed] Customers seeded.');
    console.log('========================================================');
    console.log(' SEEDING COMPLETE - DB INITIALIZED SUCCESSFULLY');
    console.log('========================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to seed database:', error);
    process.exit(1);
  }
};

seedDatabase();
