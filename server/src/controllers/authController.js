const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const {
  validateClientRegister,
  validateLogin,
  validateChangePassword,
  validateVerifyEmail,
  validateResendVerification,
} = require('../validators/auth');
const { mergeGuestCartIntoUser } = require('../services/cartService');
const { badRequest, unauthorized, tooManyRequests } = require('../utils/appError');
const { signAuthToken, getCookieOptions, getAuthCookieName } = require('../config/jwt');
const {
  createOrReplaceVerification,
  verifyEmailCode,
  resendVerificationCode,
} = require('../services/verificationService');

const setAuthCookie = (res, token) => {
  const cookieName = getAuthCookieName();
  res.cookie(cookieName, token, getCookieOptions());
};

const clearAuthCookie = (res) => {
  const cookieName = getAuthCookieName();
  const opts = getCookieOptions();
  res.clearCookie(cookieName, { path: '/', sameSite: opts.sameSite, secure: opts.secure, httpOnly: true });
};

const register = async (req, res, next) => {
  try {
    const { guestCart, ...payload } = req.body || {};
    const data = validateClientRegister(payload);

    const email = data.basicInfo.email.toLowerCase();

    const existing = await User.findOne({ $or: [{ email }, { username: email }] });
    if (existing) {
      throw badRequest('Email already in use', [{ field: 'basicInfo.email' }]);
    }

    const passwordHash = await hashPassword(data.basicInfo.password);

    const user = new User({
      name: data.basicInfo.fullName,
      email,
      username: email,
      passwordHash,
      role: 'client',
      clientType: data.clientType,
      company:
        data.clientType === 'B2B'
          ? {
              name: data.companyInfo?.companyName || null,
              address: data.companyInfo?.companyAddress || null,
              phone: data.companyInfo?.companyPhone || null,
            }
          : { name: null, address: null, phone: null },
    });

    await mergeGuestCartIntoUser(user, guestCart);
    await user.save();

    await createOrReplaceVerification(email);

    const token = signAuthToken(user);
    setAuthCookie(res, token);

    res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { guestCart, ...payload } = req.body || {};
    const data = validateLogin(payload);

    const identifier = data.identifier.toLowerCase();
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) {
      throw unauthorized('Invalid credentials');
    }
    if (user.status !== 'active') {
      throw unauthorized('Account is inactive');
    }

    const isValid = await comparePassword(data.password, user.passwordHash);
    if (!isValid) {
      throw unauthorized('Invalid credentials');
    }

    await mergeGuestCartIntoUser(user, guestCart);
    await user.save();

    const token = signAuthToken(user);
    setAuthCookie(res, token);

    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const logout = async (_req, res, next) => {
  try {
    clearAuthCookie(res);
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

const verifyEmail = async (req, res, next) => {
  try {
    const data = validateVerifyEmail(req.body || {});
    const email = data.email.toLowerCase();

    const result = await verifyEmailCode(email, data.code);

    if (result.status === 'not_found') {
      throw badRequest('Verification code expired. Please request a new code.');
    }
    if (result.status === 'expired') {
      throw badRequest('Verification code expired. Please request a new code.');
    }
    if (result.status === 'invalid') {
      throw badRequest('Invalid verification code.');
    }
    if (result.status === 'too_many_attempts') {
      throw tooManyRequests('Too many failed attempts. Please request a new verification code.');
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw badRequest('Account not found for verification');
    }

    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      await user.save();
    }

    res.json({ message: 'Email verified successfully.' });
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const data = validateResendVerification(req.body || {});
    const email = data.email.toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      throw badRequest('Account not found for verification');
    }

    if (user.isEmailVerified) {
      return res.json({ message: 'Account already verified.' });
    }

    await resendVerificationCode(email);

    res.json({ message: 'Verification code sent.' });
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
  verifyEmail,
  resendVerification,
};

