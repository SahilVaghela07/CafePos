// =========================================================================
// USER / EMPLOYEE MODEL (SEQUELIZE Schema)
// Purpose: Defines the schema and hooks for Users and Employees (Admins vs Cashiers).
// Used in: backend/src/controllers/authController.js and backend/src/controllers/userController.js
// =========================================================================

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('Admin', 'Employee'),
    allowNull: false,
    defaultValue: 'Employee' // Role defines permission access (Admin has Backend access, Employee has POS access)
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false // Archive deactivates the employee account without deleting historical transaction data
  }
}, {
  hooks: {
    // Hook runs automatically before saving a new user record to database
    // Purpose: Securely hashes the plain text password before persistence
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    // Hook runs automatically before updating an existing user record
    // Purpose: Re-hashes password only if the password field was changed
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Helper instance method to verify user logins
// Purpose: Compares the client-sent plain text password with the hashed database password
User.prototype.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;
