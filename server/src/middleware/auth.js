const User = require('../models/User');
const { unauthorized, forbidden } = require('../utils/appError');

const attachCurrentUser = async (req, _res, next) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      req.user = null;
      return next();
    }

    const user = await User.findById(userId);
    if (!user || user.status !== 'active') {
      req.user = null;
      req.session.userId = null;
      return next();
    }

    req.user = user;
    return next();
  } catch (error) {
    next(error);
  }
};

const requireAuth = (req, _res, next) => {
  if (!req.user) {
    return next(unauthorized());
  }
  next();
};

const requireRole = (roles) => (req, _res, next) => {
  if (!req.user) {
    return next(unauthorized());
  }
  if (!roles.includes(req.user.role)) {
    return next(forbidden());
  }
  next();
};

module.exports = {
  attachCurrentUser,
  requireAuth,
  requireRole,
};
