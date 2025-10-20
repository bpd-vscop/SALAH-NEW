const User = require('../models/User');
const { validateCreateUser, validateUpdateUser } = require('../validators/user');
const { hashPassword } = require('../utils/password');
const { badRequest, notFound, forbidden } = require('../utils/appError');
const { canView, canEdit, rank } = require('../utils/roles');

const listUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ accountCreated: -1 });
    const visible = req.user ? users.filter((u) => canView(req.user.role, u.role)) : users;
    res.json({ users: visible.map((u) => u.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const data = validateCreateUser(req.body || {});

    const username = data.username.toLowerCase();
    const email = data.email.toLowerCase();

    const existing = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existing) {
      const field = existing.username === username ? 'username' : 'email';
      throw badRequest(`${field === 'username' ? 'Username' : 'Email'} already in use`, [{ field }]);
    }

    // Only allow creating users with a role strictly below the creator's role
    if (req.user && !canEdit(req.user.role, data.role)) {
      throw forbidden('Insufficient privileges to create a user with this role');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await User.create({
      name: data.name,
      username,
      email,
      role: data.role,
      status: data.status,
      passwordHash,
      profileImageUrl: data.profileImageUrl || null,
      isEmailVerified: true,
    });

    res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateUser(req.body || {});

    const user = await User.findById(id);
    if (!user) {
      throw notFound('User not found');
    }

    const isSelf = req.user && (req.user.id === id || req.user._id?.toString() === id);
    // Prevent editing other users with equal or higher role; allow self-edit
    if (!isSelf && req.user && !canEdit(req.user.role, user.role)) {
      throw forbidden('You cannot edit a user with higher or equal role');
    }

    if (data.username && data.username.toLowerCase() !== user.username) {
      const normalizedUsername = data.username.toLowerCase();
      const existing = await User.findOne({ username: normalizedUsername });
      if (existing) {
        throw badRequest('Username already in use', [{ field: 'username' }]);
      }
      user.username = normalizedUsername;
    }

    if (data.email && data.email.toLowerCase() !== (user.email || '').toLowerCase()) {
      const normalizedEmail = data.email.toLowerCase();
      const existingEmail = await User.findOne({ email: normalizedEmail });
      if (existingEmail && existingEmail.id !== user.id) {
        throw badRequest('Email already in use', [{ field: 'email' }]);
      }
      user.email = normalizedEmail;
    }

    if (data.name) {
      user.name = data.name;
    }
    if (data.role) {
      if (req.user) {
        const actorRank = rank(req.user.role);
        const desiredRank = rank(data.role);
        if (isSelf) {
          // Allow same or lower role; forbid elevation
          if (desiredRank > actorRank) {
            throw forbidden('You cannot elevate your own role');
          }
        } else {
          // For other users: actor must be strictly higher than assigned role
          if (actorRank <= desiredRank) {
            throw forbidden('You cannot assign a role equal or higher than your own');
          }
        }
      }
      user.role = data.role;
    }
    if (data.status) {
      user.status = data.status;
    }
    if (data.password) {
      user.passwordHash = await hashPassword(data.password);
    }

    if (data.profileImageUrl !== undefined) {
      user.profileImageUrl = data.profileImageUrl || null;
    }

    await user.save();

    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.id === id) {
      throw badRequest('You cannot delete your own account');
    }

    const user = await User.findById(id);
    if (!user) {
      throw notFound('User not found');
    }

    if (req.user && !canEdit(req.user.role, user.role)) {
      throw forbidden('You cannot delete a user with higher or equal role');
    }

    await User.findByIdAndDelete(id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
