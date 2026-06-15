// =========================================================================
// DATABASE SEED SCRIPT
// Purpose: Seeds extensive mock data (100+ Users, 10 Categories, 120 Products,
// 100 Tables across 5 Floors, 100 Promotions, 120 Customers, and 150 historical Orders)
// for local development, testing, and rich database visualization.
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
const Order = require('./models/Order');
const OrderItem = require('./models/OrderItem');

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

    // 2. Seed 100 Users & Employees (hashing passwords)
    console.log('[Seed] Seeding 100 users/employees...');
    
    // Core users
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@cafe.pos',
      password: 'admin123',
      role: 'Admin'
    });

    const john = await User.create({
      name: 'John Cashier',
      email: 'john@cafe.pos',
      password: 'cashier123',
      role: 'Employee'
    });

    const emma = await User.create({
      name: 'Emma Cashier',
      email: 'emma@cafe.pos',
      password: 'emma123',
      role: 'Employee'
    });

    const firstNamesList = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
    const lastNamesList = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez'];

    const allUsers = [admin, john, emma];

    // Seed 97 additional staff/cashiers
    for (let u = 4; u <= 100; u++) {
      const fName = firstNamesList[u % firstNamesList.length];
      const lName = lastNamesList[u % lastNamesList.length];
      const name = `${fName} ${lName}`;
      const email = `employee${u}@cafe.pos`;
      
      const user = await User.create({
        name,
        email,
        password: 'password123',
        role: u % 8 === 0 ? 'Admin' : 'Employee'
      });
      allUsers.push(user);
    }
    console.log('[Seed] 100 users seeded successfully.');

    // 3. Seed 10 Categories
    console.log('[Seed] Seeding 10 categories...');
    const categoryConfigs = [
      { name: 'Espresso Bar', color: '#8B4513' },
      { name: 'Brewed Tea', color: '#228B22' },
      { name: 'Soft Drinks', color: '#1E90FF' },
      { name: 'Milkshakes', color: '#FFD700' },
      { name: 'Fresh Juices', color: '#FF8C00' },
      { name: 'Sandwiches', color: '#D2691E' },
      { name: 'Burgers', color: '#CD853F' },
      { name: 'Cakes & Slices', color: '#BA55D3' },
      { name: 'Cookies & Muffins', color: '#FF69B4' },
      { name: 'Breakfast Bowls', color: '#3CB371' }
    ];

    const categories = [];
    for (const config of categoryConfigs) {
      const cat = await Category.create(config);
      categories.push(cat);
    }
    console.log('[Seed] 10 menu categories seeded.');

    // 4. Seed 120 Products (12 products per category)
    console.log('[Seed] Seeding 120 menu products...');
    const menuStructure = {
      'Espresso Bar': [
        { name: 'Double Espresso', price: 2.50, tax: 5.0, description: 'Rich dark espresso double shot.' },
        { name: 'Macchiato', price: 2.80, tax: 5.0, description: 'Espresso marked with milk foam.' },
        { name: 'Cortado', price: 3.00, tax: 5.0, description: 'Equal parts espresso and warm milk.' },
        { name: 'Americano', price: 3.00, tax: 5.0, description: 'Espresso shots topped with hot water.' },
        { name: 'Flat White', price: 3.50, tax: 5.0, description: 'Velvety micro-foamed milk over espresso.' },
        { name: 'Cappuccino', price: 3.50, tax: 5.0, description: 'Espresso with steamed milk foam.' },
        { name: 'Cafe Latte', price: 3.80, tax: 5.0, description: 'Steamed milk over rich double espresso.' },
        { name: 'Cafe Mocha', price: 4.20, tax: 5.0, description: 'Espresso with chocolate sauce and milk.' },
        { name: 'Affogato', price: 4.50, tax: 8.0, description: 'Vanilla ice cream drowned in espresso.' },
        { name: 'Cold Brew Coffee', price: 4.00, tax: 5.0, description: 'Slow steeped cold brewed coffee.' },
        { name: 'Nitro Cold Brew', price: 4.80, tax: 5.0, description: 'Nitrogen-infused cold brew on tap.' },
        { name: 'Iced Caramel Latte', price: 4.50, tax: 5.0, description: 'Sweet caramel iced latte drink.' }
      ],
      'Brewed Tea': [
        { name: 'English Breakfast', price: 2.50, tax: 5.0, description: 'Traditional premium black tea.' },
        { name: 'Earl Grey Special', price: 2.80, tax: 5.0, description: 'Black tea infused with bergamot.' },
        { name: 'Organic Green Tea', price: 2.50, tax: 5.0, description: 'Pure Japanese steamed green tea.' },
        { name: 'Jasmine Green Tea', price: 2.80, tax: 5.0, description: 'Green tea scented with jasmine blossoms.' },
        { name: 'Chamomile Blossom', price: 3.00, tax: 5.0, description: 'Soothing caffeine-free herbal tea.' },
        { name: 'Peppermint Herbal', price: 3.00, tax: 5.0, description: 'Cool refreshing organic peppermint.' },
        { name: 'Spiced Chai Latte', price: 4.00, tax: 5.0, description: 'Sweet black tea spices with milk.' },
        { name: 'Matcha Green Latte', price: 4.50, tax: 5.0, description: 'Authentic stoneground matcha with milk.' },
        { name: 'Peach Iced Tea', price: 3.50, tax: 5.0, description: 'House brewed sweet peach iced tea.' },
        { name: 'Lemon Mint Iced Tea', price: 3.50, tax: 5.0, description: 'Refreshing zesty lemon iced tea.' },
        { name: 'Hibiscus Herbal', price: 3.20, tax: 5.0, description: 'Tart fruity herbal infusion.' },
        { name: 'Highland Oolong', price: 3.50, tax: 5.0, description: 'Semi-oxidized traditional Chinese tea.' }
      ],
      'Soft Drinks': [
        { name: 'Classic Cola', price: 2.00, tax: 8.0, description: 'Chilled glass bottle classic cola.' },
        { name: 'Diet Cola Zero', price: 2.00, tax: 8.0, description: 'Sugar-free zero calorie cola.' },
        { name: 'Citrus Lemonade', price: 2.20, tax: 8.0, description: 'Zesty lemon-lime sparkling soda.' },
        { name: 'Spiced Ginger Beer', price: 2.80, tax: 8.0, description: 'Fiery brewed ginger non-alcoholic beer.' },
        { name: 'Sparkling Tonic', price: 2.00, tax: 8.0, description: 'Premium carbonated tonic water.' },
        { name: 'Club Soda Water', price: 1.50, tax: 5.0, description: 'Crisp carbonated spring water.' },
        { name: 'Cream Root Beer', price: 2.50, tax: 8.0, description: 'Old fashioned sweet sarsaparilla.' },
        { name: 'Sparkling Apple', price: 2.80, tax: 8.0, description: 'Carbonated fresh apple juice.' },
        { name: 'Orange Soda Splash', price: 2.00, tax: 8.0, description: 'Sweet fizzy orange soft drink.' },
        { name: 'Iced Spring Water', price: 1.20, tax: 0.0, description: 'Still pure bottled mineral water.' },
        { name: 'Ginger Ale Premium', price: 2.20, tax: 8.0, description: 'Mild sparkling ginger flavored soda.' },
        { name: 'Grapefruit Fizz', price: 2.80, tax: 8.0, description: 'Tart carbonated pink grapefruit.' }
      ],
      'Milkshakes': [
        { name: 'Classic Chocolate', price: 4.50, tax: 8.0, description: 'Thick chocolate milkshake with cream.' },
        { name: 'French Vanilla', price: 4.50, tax: 8.0, description: 'Creamy vanilla bean milkshake.' },
        { name: 'Sweet Strawberry', price: 4.50, tax: 8.0, description: 'Fresh strawberry blend milkshake.' },
        { name: 'Salted Caramel Shake', price: 5.00, tax: 8.0, description: 'Rich caramel and sea salt shake.' },
        { name: 'Oreo Cookies Cream', price: 5.50, tax: 8.0, description: 'Blended Oreo cookie shake treats.' },
        { name: 'Peanut Butter Shake', price: 5.50, tax: 8.0, description: 'Creamy peanut butter indulgence.' },
        { name: 'Banana Split Shake', price: 5.00, tax: 8.0, description: 'Banana, cherry, and vanilla blend.' },
        { name: 'Nutella Cream Shake', price: 5.80, tax: 8.0, description: 'Hazelnut chocolate spread milkshake.' },
        { name: 'Mint Choc Chip Shake', price: 5.00, tax: 8.0, description: 'Mint syrup blended with choc chips.' },
        { name: 'Mocha Coffee Shake', price: 5.20, tax: 8.0, description: 'Cold espresso blended chocolate shake.' },
        { name: 'Coconut Bounty Shake', price: 5.20, tax: 8.0, description: 'Coconut milk and cocoa shake blend.' },
        { name: 'Mango Sunshine Shake', price: 5.50, tax: 8.0, description: 'Creamy mango pulp milkshake.' }
      ],
      'Fresh Juices': [
        { name: 'Pure Orange Juice', price: 4.00, tax: 0.0, description: '100% freshly squeezed orange juice.' },
        { name: 'Cloudy Apple Juice', price: 4.00, tax: 0.0, description: 'Cold pressed sweet apples.' },
        { name: 'Watermelon Cooler', price: 4.50, tax: 0.0, description: 'Hydrating fresh watermelon juice.' },
        { name: 'Tropical Pineapple', price: 4.50, tax: 0.0, description: 'Tangy fresh pressed pineapple.' },
        { name: 'Carrot Ginger Boost', price: 4.80, tax: 0.0, description: 'Sweet carrot juice with spicy ginger.' },
        { name: 'Green Detox Cleanse', price: 5.00, tax: 0.0, description: 'Celery, cucumber, kale, apple, lemon.' },
        { name: 'Ruby Grapefruit', price: 4.20, tax: 0.0, description: 'Zesty cold pressed pink grapefruit.' },
        { name: 'ABC Healthy Juice', price: 5.00, tax: 0.0, description: 'Apple, beetroot, and carrot blend.' },
        { name: 'Pomegranate Ruby', price: 5.50, tax: 0.0, description: 'Antioxidant-rich fresh pomegranate.' },
        { name: 'Lemon Ginger Zinger', price: 4.00, tax: 0.0, description: 'Lemon juice, ginger shot, raw honey.' },
        { name: 'Strawberry Limeade', price: 4.50, tax: 5.0, description: 'Fresh strawberries blended with lime.' },
        { name: 'Passionfruit Mango', price: 5.20, tax: 0.0, description: 'Exotic tropical pure juice blend.' }
      ],
      'Sandwiches': [
        { name: 'Classic Ham & Cheese', price: 5.50, tax: 5.0, description: 'Smoked ham and cheddar on sourdough.' },
        { name: 'Turkey & Swiss Club', price: 6.50, tax: 5.0, description: 'Sliced turkey, swiss, lettuce, tomato.' },
        { name: 'Tuscan Caprese Panini', price: 6.00, tax: 5.0, description: 'Mozzarella, tomato, basil pesto.' },
        { name: 'Chicken Pesto Ciabatta', price: 7.00, tax: 5.0, description: 'Grilled chicken, provolone, pesto.' },
        { name: 'Spicy Roast Beef', price: 7.50, tax: 5.0, description: 'Shaved roast beef, horseradish, rocket.' },
        { name: 'Tuna Salad Melt', price: 6.20, tax: 5.0, description: 'Tuna salad, melted cheddar, pickles.' },
        { name: 'Garden Veggie Wrap', price: 5.80, tax: 5.0, description: 'Hummus, avocado, cucumber, peppers.' },
        { name: 'BLT Double Decker', price: 6.50, tax: 5.0, description: 'Bacon, lettuce, tomato, herb mayo.' },
        { name: 'BBQ Pulled Pork', price: 8.00, tax: 5.0, description: 'Slow cooked pork, coleslaw, brioche.' },
        { name: 'Smoked Salmon Bagel', price: 8.50, tax: 5.0, description: 'Salmon, cream cheese, capers, dill.' },
        { name: 'Egg Salad Brioche', price: 5.20, tax: 5.0, description: 'Classic egg mayonnaise with chives.' },
        { name: 'Falafel Tahini Flatbread', price: 6.00, tax: 5.0, description: 'Baked falafel, pickles, tahini sauce.' }
      ],
      'Burgers': [
        { name: 'Classic Beef Burger', price: 8.00, tax: 8.0, description: 'Angus beef patty, lettuce, house sauce.' },
        { name: 'Double Cheeseburger', price: 9.50, tax: 8.0, description: 'Two beef patties, double cheddar cheese.' },
        { name: 'Bacon BBQ Burger', price: 10.50, tax: 8.0, description: 'Crisp bacon, onion rings, BBQ glaze.' },
        { name: 'Crispy Buttermilk Chicken', price: 9.00, tax: 8.0, description: 'Fried chicken breast, spicy mayo, slaw.' },
        { name: 'Swiss Mushroom Burger', price: 10.00, tax: 8.0, description: 'Beef patty, sautéed mushrooms, Swiss cheese.' },
        { name: 'Spicy Jalapeno Burger', price: 9.20, tax: 8.0, description: 'Jalapeno slices, pepper jack, chili aioli.' },
        { name: 'Ultimate Veggie Patty', price: 8.50, tax: 8.0, description: 'Black bean patty, avocado, sprouts.' },
        { name: 'Hawaiian Chicken Burger', price: 10.00, tax: 8.0, description: 'Grilled chicken, grilled pineapple, teriyaki.' },
        { name: 'Blue Cheese Royale', price: 11.00, tax: 8.0, description: 'Blue cheese crumbles, caramelized onions.' },
        { name: 'Southern Fish Burger', price: 9.50, tax: 8.0, description: 'Battered cod fillet, tartar sauce, lettuce.' },
        { name: 'Avocado Turkey Burger', price: 9.00, tax: 8.0, description: 'Lean ground turkey patty, fresh avocado.' },
        { name: 'Monster Triple Stack', price: 13.50, tax: 8.0, description: 'Three beef patties, triple cheese, bacon.' }
      ],
      'Cakes & Slices': [
        { name: 'Chocolate Fudge Cake', price: 4.50, tax: 8.0, description: 'Rich dark chocolate fudge cake slice.' },
        { name: 'Classic New York Cheesecake', price: 4.80, tax: 8.0, description: 'Dense creamy cheesecake graham base.' },
        { name: 'Red Velvet Vanilla Slice', price: 4.50, tax: 8.0, description: 'Red velvet cake with cream cheese frosting.' },
        { name: 'Zesty Lemon Drizzle', price: 3.80, tax: 8.0, description: 'Moist lemon loaf cake with sugar glaze.' },
        { name: 'Spiced Carrot Cake', price: 4.20, tax: 8.0, description: 'Carrot and walnut cake with frosting.' },
        { name: 'Italian Tiramisu Cup', price: 5.00, tax: 8.0, description: 'Coffee dipped ladyfingers and mascarpone.' },
        { name: 'Salted Caramel Tart', price: 4.50, tax: 8.0, description: 'Buttery pastry with rich gooey caramel.' },
        { name: 'Apple Cinnamon Crumble', price: 4.00, tax: 8.0, description: 'Baked sweet apples with butter streusel.' },
        { name: 'Triple Chocolate Brownie', price: 3.80, tax: 8.0, description: 'Fudgy brownie with white/milk/dark chips.' },
        { name: 'Macadamia Blondie Slice', price: 3.80, tax: 8.0, description: 'White chocolate blondie with macadamias.' },
        { name: 'Raspberry Coconut Bar', price: 3.50, tax: 8.0, description: 'Sweet raspberry jam coconut crumble base.' },
        { name: 'Victoria Sponge Cake', price: 4.20, tax: 8.0, description: 'Fluffy sponge cake with jam and cream.' }
      ],
      'Cookies & Muffins': [
        { name: 'Chocochip Giant Cookie', price: 2.50, tax: 5.0, description: 'Soft baked giant chocolate chip cookie.' },
        { name: 'Double Chocolate Cookie', price: 2.50, tax: 5.0, description: 'Chocolate dough with white chocolate chunks.' },
        { name: 'Oatmeal Raisin Cookie', price: 2.20, tax: 5.0, description: 'Chewy oatmeal cookie with sweet raisins.' },
        { name: 'White Macadamia Cookie', price: 2.80, tax: 5.0, description: 'Buttery cookie with macadamia and white chips.' },
        { name: 'Blueberry Streusel Muffin', price: 3.20, tax: 5.0, description: 'Fresh blueberries with crunchy sugar crust.' },
        { name: 'Double Choc Fudge Muffin', price: 3.50, tax: 5.0, description: 'Decadent chocolate muffin chocolate core.' },
        { name: 'Apple Cinnamon Muffin', price: 3.20, tax: 5.0, description: 'Warm spiced apple filling muffin.' },
        { name: 'Banana Walnut Muffin', price: 3.20, tax: 5.0, description: 'Ripe banana muffin topped with walnuts.' },
        { name: 'Gluten-Free Almond Muffin', price: 3.80, tax: 5.0, description: 'GF almond meal muffin with orange zest.' },
        { name: 'Buttery Croissant', price: 3.00, tax: 5.0, description: 'Flaky French butter pastry croissant.' },
        { name: 'Chocolate Pain au Chocolat', price: 3.50, tax: 5.0, description: 'Laminated pastry with chocolate sticks.' },
        { name: 'Cinnamon Swirl Roll', price: 3.50, tax: 5.0, description: 'Sweet rolled pastry cinnamon sugar glaze.' }
      ],
      'Breakfast Bowls': [
        { name: 'Amazonian Acai Bowl', price: 6.50, tax: 0.0, description: 'Acai purée with banana, berries, granola.' },
        { name: 'Greek Yogurt Granola', price: 5.00, tax: 0.0, description: 'Greek yogurt with honey and honey baked oats.' },
        { name: 'Classic Oatmeal Berry', price: 4.50, tax: 0.0, description: 'Warm steel-cut oats with fresh berries.' },
        { name: 'Chia Seed Coconut Pudding', price: 5.00, tax: 0.0, description: 'Chia seeds soaked in coconut milk fruit compote.' },
        { name: 'Bircher Muesli Cup', price: 5.50, tax: 0.0, description: 'Oats soaked in apple juice, yogurt, grated apple.' },
        { name: 'Quinoa Breakfast Porridge', price: 6.00, tax: 0.0, description: 'Warm quinoa cooked in almond milk cinnamon.' },
        { name: 'Avocado Toast Bowl', price: 7.00, tax: 5.0, description: 'Poached eggs, avocado mash, cherry tomatoes.' },
        { name: 'Peanut Butter Banana Oats', price: 5.20, tax: 0.0, description: 'Oatmeal, peanut butter drizzle, sliced banana.' },
        { name: 'Superfood Pitaya Bowl', price: 6.80, tax: 0.0, description: 'Dragonfruit blend, strawberries, coconut flakes.' },
        { name: 'Smoked Salmon Breakfast', price: 9.00, tax: 5.0, description: 'Salmon, spinach, poached eggs, hollandaise.' },
        { name: 'Maple Bacon Pancakes', price: 7.50, tax: 8.0, description: 'Stack of buttermilk pancakes with bacon, syrup.' },
        { name: 'Belgian Waffles Berries', price: 7.00, tax: 8.0, description: 'Crispy waffles, mixed berry coulis, ice cream.' }
      ]
    };

    const products = [];
    for (const cat of categories) {
      const prodsData = menuStructure[cat.name] || [];
      for (const item of prodsData) {
        const prod = await Product.create({
          ...item,
          uom: 'pcs',
          categoryId: cat.id
        });
        products.push(prod);
      }
    }
    console.log(`[Seed] ${products.length} unique products seeded.`);

    // 5. Seed 5 Floors and 100 Tables (20 tables per floor)
    console.log('[Seed] Seeding 5 floors & 100 tables...');
    const floorNames = ['Main Dining', 'Glasshouse Greenhouse', 'Garden Terrace', 'Cosy Lounge', 'Rooftop Bar'];
    const floors = [];
    for (const name of floorNames) {
      const f = await Floor.create({ name });
      floors.push(f);
    }

    const tables = [];
    const seatWeights = [2, 2, 4, 4, 4, 6, 8];
    for (let fIdx = 0; fIdx < floors.length; fIdx++) {
      const floor = floors[fIdx];
      for (let tNum = 1; tNum <= 20; tNum++) {
        // Table number format: "Table 101" to "Table 120", "Table 201" to "Table 220", etc.
        const tableNumber = `Table ${(fIdx + 1) * 100 + tNum}`;
        const seats = seatWeights[Math.floor(Math.random() * seatWeights.length)];
        const tbl = await Table.create({
          tableNumber,
          seats,
          floorId: floor.id
        });
        tables.push(tbl);
      }
    }
    console.log(`[Seed] 5 floors and ${tables.length} tables seeded.`);

    // 6. Seed 100 Promotions/Coupons
    console.log('[Seed] Seeding 100 coupon codes...');
    const promotions = [];
    for (let p = 1; p <= 100; p++) {
      const isPercentage = p % 2 === 0;
      const discountValue = isPercentage ? (Math.floor(Math.random() * 5) * 5 + 10) : (Math.floor(Math.random() * 3) * 5 + 5); // 10%-30% or $5-$15
      
      const promo = await Promotion.create({
        name: `Promo Code SAVE${p}`,
        type: 'Coupon',
        code: `SAVE${p}`,
        applyOn: 'Order',
        discountType: isPercentage ? 'Percentage' : 'Fixed',
        discountValue: discountValue
      });
      promotions.push(promo);
    }
    console.log('[Seed] 100 promotions seeded.');

    // 7. Seed 120 Customers
    console.log('[Seed] Seeding 120 customers...');
    const customers = [];
    for (let c = 1; c <= 120; c++) {
      const fName = firstNamesList[c % firstNamesList.length];
      const lName = lastNamesList[(c * 3) % lastNamesList.length];
      const name = `${fName} ${lName}`;
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.${c}@gmail.com`;
      const phone = '9' + String(Math.floor(Math.random() * 900000000) + 100000000);
      
      const cust = await Customer.create({ name, email, phone });
      customers.push(cust);
    }
    console.log('[Seed] 120 customers seeded.');

    // 8. Seed 150 historical orders
    console.log('[Seed] Seeding 150 historical orders...');
    const paymentMethods = ['Cash', 'Card', 'UPI'];
    const statuses = ['Paid', 'Paid', 'Paid', 'Paid', 'Paid', 'Paid', 'Paid', 'Paid', 'Paid', 'Cancelled', 'Draft'];
    const kdsStatuses = ['Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Preparing', 'To Cook'];

    for (let i = 1; i <= 150; i++) {
      const orderNumber = `#${2000 + i}`;
      const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
      const randomTable = tables[Math.floor(Math.random() * tables.length)];
      const randomCustomer = Math.random() > 0.4 ? customers[Math.floor(Math.random() * customers.length)] : null;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const paymentMethod = status === 'Paid' ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)] : null;
      const kdsStatus = status === 'Paid' ? 'Completed' : kdsStatuses[Math.floor(Math.random() * kdsStatuses.length)];
      
      // Determine date spread out in the last 30 days
      const date = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));

      const itemCount = Math.floor(Math.random() * 4) + 1; // 1 to 4 items
      const selectedProducts = [];
      const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
      for (let j = 0; j < itemCount; j++) {
        selectedProducts.push(shuffledProducts[j]);
      }

      let subtotal = 0;
      let totalTax = 0;
      const itemsData = [];

      for (const prod of selectedProducts) {
        const quantity = Math.floor(Math.random() * 3) + 1; // 1 to 3 quantity
        const price = prod.price;
        const taxRate = prod.tax || 5.0;
        const itemTotal = quantity * price;
        const taxAmount = parseFloat((itemTotal * (taxRate / 100)).toFixed(2));
        
        subtotal += itemTotal;
        totalTax += taxAmount;
        
        itemsData.push({
          productId: prod.id,
          quantity,
          price,
          discountAmount: 0.00,
          total: itemTotal
        });
      }

      const discountAmount = 0.00;
      const total = parseFloat((subtotal + totalTax - discountAmount).toFixed(2));

      const order = await Order.create({
        orderNumber,
        status,
        subtotal,
        tax: totalTax,
        discountAmount,
        total,
        paymentMethod,
        paymentReference: paymentMethod === 'Card' ? `TXN-${Math.floor(Math.random() * 900000) + 100000}` : null,
        kdsStatus,
        userId: randomUser.id,
        tableId: randomTable.id,
        customerId: randomCustomer ? randomCustomer.id : null,
        createdAt: date,
        updatedAt: date
      });

      for (const item of itemsData) {
        await OrderItem.create({
          ...item,
          orderId: order.id,
          createdAt: date,
          updatedAt: date
        });
      }
    }

    console.log('[Seed] 150 historical orders and order items seeded successfully.');
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
