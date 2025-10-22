const User = require('../models/User');
const { validateCreateUser, validateUpdateUser } = require('../validators/user');
const { validateAdminProfile } = require('../validators/adminProfile');
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

    if (data.username) {
      const existing = await User.findOne({ username: data.username });
      if (existing) {
        throw badRequest('Username already in use', [{ field: 'username' }]);
      }
    }

    if (data.email) {
      const existingEmail = await User.findOne({ email: data.email.toLowerCase() });
      if (existingEmail) {
        throw badRequest('Email already in use', [{ field: 'email' }]);
      }
    }

    // Only allow creating users with a role strictly below the creator's role
    if (req.user && !canEdit(req.user.role, data.role)) {
      throw forbidden('Insufficient privileges to create a user with this role');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await User.create({
      name: data.name,
      username: data.role === 'client' ? undefined : data.username,
      email: data.email?.toLowerCase(),
      role: data.role,
      status: data.status,
      passwordHash,
      isEmailVerified: data.role !== 'client',
    });

    res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = { ...(req.body || {}) };

    if (req.file) {
      payload.profileImage = `profile/${req.file.filename}`;
      payload.removeProfileImage = false;
    }

    const data = validateUpdateUser(payload);

    const user = await User.findById(id);
    if (!user) {
      throw notFound('User not found');
    }

    const isSelf = req.user && (req.user.id === id || req.user._id?.toString() === id);
    // Prevent editing other users with equal or higher role; allow self-edit
    if (!isSelf && req.user && !canEdit(req.user.role, user.role)) {
      throw forbidden('You cannot edit a user with higher or equal role');
    }

    if (isSelf && ['admin', 'super_admin'].includes(user.role)) {
      const profileImageValue = Object.prototype.hasOwnProperty.call(data, 'profileImage')
        ? data.profileImage
        : data.removeProfileImage
        ? null
        : user.profileImage ?? null;

      validateAdminProfile({
        fullName: data.fullName ?? data.name ?? user.name,
        email: data.email ?? user.email,
        profileImage: profileImageValue,
      });
    }

    const desiredRole = data.role || user.role;

    if (Object.prototype.hasOwnProperty.call(data, 'username')) {
      const providedUsername = data.username ?? undefined;
      if (desiredRole === 'client') {
        if (providedUsername) {
          throw badRequest('Clients do not use usernames', [{ field: 'username' }]);
        }
        user.username = undefined;
        user.set('username', undefined);
      } else {
        if (!providedUsername) {
          throw badRequest('Username is required for this role', [{ field: 'username' }]);
        }
        if (providedUsername !== user.username) {
          const existing = await User.findOne({ username: providedUsername });
          if (existing) {
            throw badRequest('Username already in use', [{ field: 'username' }]);
          }
          user.username = providedUsername;
        }
      }
    }

    if (data.email && data.email.toLowerCase() !== (user.email || '').toLowerCase()) {
      const existingEmail = await User.findOne({ email: data.email.toLowerCase() });
      if (existingEmail && existingEmail.id !== user.id) {
        throw badRequest('Email already in use', [{ field: 'email' }]);
      }
      user.email = data.email.toLowerCase();
      if (user.role !== 'client') {
        user.isEmailVerified = true;
      }
    }

    if (data.fullName) {
      user.name = data.fullName;
    } else if (data.name) {
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

    if (user.role !== 'client' && !user.username) {
      throw badRequest('Username is required for this role', [{ field: 'username' }]);
    }
    if (user.role === 'client' && user.username) {
      user.username = undefined;
      user.set('username', undefined);
    }

    if (data.status) {
      user.status = data.status;
    }
    if (data.password) {
      user.passwordHash = await hashPassword(data.password);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'profileImage')) {
      user.profileImage = data.profileImage;
    } else if (data.removeProfileImage) {
      user.profileImage = null;
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
