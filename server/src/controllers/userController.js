const User = require('../models/User');
const { validateCreateUser, validateUpdateUser } = require('../validators/user');
const { hashPassword } = require('../utils/password');
const { badRequest, notFound } = require('../utils/appError');

const listUsers = async (_req, res, next) => {
  try {
    const users = await User.find().sort({ accountCreated: -1 });
    res.json({ users: users.map((u) => u.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const data = validateCreateUser(req.body || {});

    const existing = await User.findOne({ username: data.username });
    if (existing) {
      throw badRequest('Username already in use', [{ field: 'username' }]);
    }

    const passwordHash = await hashPassword(data.password);

    const user = await User.create({
      name: data.name,
      username: data.username,
      role: data.role,
      status: data.status,
      passwordHash,
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

    if (data.username && data.username !== user.username) {
      const existing = await User.findOne({ username: data.username });
      if (existing) {
        throw badRequest('Username already in use', [{ field: 'username' }]);
      }
      user.username = data.username;
    }

    if (data.name) {
      user.name = data.name;
    }
    if (data.role) {
      user.role = data.role;
    }
    if (data.status) {
      user.status = data.status;
    }
    if (data.password) {
      user.passwordHash = await hashPassword(data.password);
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

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      throw notFound('User not found');
    }

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
