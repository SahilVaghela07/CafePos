// =========================================================================
// USER & EMPLOYEE CONTROLLER
// Purpose: Handles Admin actions for list, create, change password, archive, and delete.
// Used in: backend/src/routes/userRoutes.js
// =========================================================================

const User = require('../models/User');

// Handler: getUsers
// Purpose: Returns all user accounts (Admins and Cashiers) for admin review.
// Routed from: GET /api/users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] } // Do not expose hashed password keys
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('[User Controller] GetUsers Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: createUser
// Purpose: Creates a new user/cashier account from the admin dashboard panel.
// Routed from: POST /api/users
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields (name, email, password, role) are required' });
    }

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const newUser = await User.create({ name, email, password, role });
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isArchived: newUser.isArchived
      }
    });
  } catch (error) {
    console.error('[User Controller] CreateUser Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: changePassword
// Purpose: Admin changes the password for an employee account.
// Routed from: PUT /api/users/:id/change-password
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set password. Hashing runs automatically inside the User model beforeUpdate hook.
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('[User Controller] ChangePassword Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: toggleArchiveUser
// Purpose: Archives (deactivates) or unarchives a user account without deleting transaction history.
// Routed from: PUT /api/users/:id/archive
exports.toggleArchiveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Toggle the archived flag
    user.isArchived = !user.isArchived;
    await user.save();

    res.status(200).json({
      message: `User account has been ${user.isArchived ? 'archived (deactivated)' : 'restored (activated)'}`,
      user: {
        id: user.id,
        name: user.name,
        isArchived: user.isArchived
      }
    });
  } catch (error) {
    console.error('[User Controller] ArchiveUser Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Handler: deleteUser
// Purpose: Completely deletes a user account.
// Routed from: DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.destroy();
    res.status(200).json({ message: 'User account deleted successfully' });
  } catch (error) {
    console.error('[User Controller] DeleteUser Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
