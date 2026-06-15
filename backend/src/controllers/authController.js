// =========================================================================
// AUTHENTICATION CONTROLLER
// Purpose: Handles logic for user/employee signup and login, and token generation.
// Used in: backend/src/routes/authRoutes.js
// =========================================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforcafe-pos-2026';

// Helper function to generate a JWT token
// Expiration is set to 24h representing a standard daily POS shift length
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '24h' });
};

// Handler: signup
// Purpose: Creates a new user/employee account.
// Routed from: POST /api/auth/signup (Signup form)
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate request inputs
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    // Check if the email is already registered in the system
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Count existing users in the system.
    // Purpose: Automatically promote the first registered user to "Admin" role if no role was provided.
    const userCount = await User.count();
    const assignedRole = role || (userCount === 0 ? 'Admin' : 'Employee');

    // Create the user record in database. Password hashing is executed automatically in the User model hooks.
    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole
    });

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: generateToken(user.id)
    });
  } catch (error) {
    console.error('[Auth Controller] Signup Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: login
// Purpose: Validates credentials and logs in the user, returning a token.
// Routed from: POST /api/auth/login (Login form)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Lookup user in DB
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if the cashier account has been archived by the administrator
    if (user.isArchived) {
      return res.status(403).json({ message: 'Your account has been archived/deactivated. Please contact your administrator.' });
    }

    // Check password matches database record
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Successful login: issue token
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token: generateToken(user.id)
    });
  } catch (error) {
    console.error('[Auth Controller] Login Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
