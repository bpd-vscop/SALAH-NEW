const User = require('../models/User');
const { unauthorized, forbidden } = require('../utils/appError');
const { verifyAuthToken, getAuthCookieName } = require('../config/jwt');

const extractToken = (req) => {
  const cookieName = getAuthCookieName();
  const cookieToken = req.cookies?.[cookieName];
  if (cookieToken) return cookieToken;
  const authHeader = req.headers?.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
};

const attachCurrentUser = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      decoded = verifyAuthToken(token);
    } catch (_e) {
      req.user = null;
      return next();
    }

    const userId = decoded?.sub;
    if (!userId) {
      req.user = null;
      return next();
    }

    const user = await User.findById(userId);
    if (!user || user.status !== 'active') {
      req.user = null;
      return next();
    }

    req.user = user;
    if (user.role === 'client' && user.isEmailVerified === false) {
      req.requiresEmailVerification = true;
    } else {
      req.requiresEmailVerification = false;
    }
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

