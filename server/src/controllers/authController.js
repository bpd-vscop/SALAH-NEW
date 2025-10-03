const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { validateRegister, validateLogin, validateChangePassword } = require('../validators/auth');
const { mergeGuestCartIntoUser } = require('../services/cartService');
const { badRequest, unauthorized } = require('../utils/appError');

const startUserSession = (req, user) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        return reject(error);
      }
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.save((saveError) => {
        if (saveError) {
          return reject(saveError);
        }
        resolve();
      });
    });
  });

const clearSessionCookie = (res) => {
  const sameSite = process.env.SESSION_SAMESITE || 'lax';
  const secure = process.env.SESSION_SECURE === 'true';
  res.clearCookie('connect.sid', { path: '/', sameSite, secure, httpOnly: true });
};

const register = async (req, res, next) => {
  try {
    const { guestCart, ...payload } = req.body || {};
    const data = validateRegister(payload);

    const existing = await User.findOne({ username: data.username });
    if (existing) {
      throw badRequest('Username already in use', [{ field: 'username' }]);
    }

    const passwordHash = await hashPassword(data.password);

    const user = new User({
      name: data.name,
      username: data.username,
      passwordHash,
      role: 'client',
    });

    await mergeGuestCartIntoUser(user, guestCart);
    await user.save();
    await startUserSession(req, user);

    res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { guestCart, ...payload } = req.body || {};
    const data = validateLogin(payload);

    const user = await User.findOne({ username: data.username });
    if (!user) {
      throw unauthorized('Invalid username or password');
    }
    if (user.status !== 'active') {
      throw unauthorized('Account is inactive');
    }

    const isValid = await comparePassword(data.password, user.passwordHash);
    if (!isValid) {
      throw unauthorized('Invalid username or password');
    }

    await mergeGuestCartIntoUser(user, guestCart);
    await user.save();
    await startUserSession(req, user);

    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
    clearSessionCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const currentUser = (req, res) => {
  if (!req.user) {
    return res.status(200).json({ user: null });
  }
  res.json({ user: req.user.toJSON() });
};

const changePassword = async (req, res, next) => {
  try {
    const payload = validateChangePassword(req.body || {});
    const user = req.user;
    if (!user) {
      throw unauthorized();
    }

    const matches = await comparePassword(payload.currentPassword, user.passwordHash);
    if (!matches) {
      throw unauthorized('Current password is incorrect');
    }

    user.passwordHash = await hashPassword(payload.newPassword);
    await user.save();

    res.json({ message: 'Password updated' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  currentUser,
  changePassword,
};
