const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const {
  validateClientRegistration,
  validateLogin,
  validateChangePassword,
  validateVerification,
} = require('../validators/auth');
const { mergeGuestCartIntoUser } = require('../services/cartService');
const { badRequest, unauthorized } = require('../utils/appError');
const { signAuthToken, getCookieOptions, getAuthCookieName } = require('../config/jwt');
const EmailVerification = require('../models/EmailVerification');
const { sendVerificationEmail } = require('../services/emailService');

const setAuthCookie = (res, token) => {
  const cookieName = getAuthCookieName();
  res.cookie(cookieName, token, getCookieOptions());
};

const clearAuthCookie = (res) => {
  const cookieName = getAuthCookieName();
  const opts = getCookieOptions();
  res.clearCookie(cookieName, { path: '/', sameSite: opts.sameSite, secure: opts.secure, httpOnly: true });
};

const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const upsertVerificationCode = async (email) => {
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const verification = await EmailVerification.findOneAndUpdate(
    { email },
    { code, expiresAt, attempts: 0, lastAttemptAt: null },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return { code, expiresAt: verification.expiresAt };
};

const register = async (req, res, next) => {
  try {
    const payload = validateClientRegistration(req.body || {});
    const { clientType, basicInfo, companyInfo, guestCart } = payload;

    const email = basicInfo.email.toLowerCase();

    const existing = await User.findOne({
      $or: [{ username: email }, { email }],
    });
    if (existing) {
      throw badRequest('Email already in use', [{ field: 'email' }]);
    }

    const passwordHash = await hashPassword(basicInfo.password);

    const user = new User({
      name: basicInfo.fullName.trim(),
      username: email,
      email,
      passwordHash,
      role: 'client',
      clientType,
      company:
        clientType === 'B2B'
          ? {
              name: companyInfo?.companyName?.trim() || null,
              address: companyInfo?.companyAddress?.trim() || null,
              phone: companyInfo?.companyPhone || null,
            }
          : undefined,
      isEmailVerified: false,
    });

    // Only clients maintain shopping carts; ignore guest cart for staff/admin roles
    if (user.role === 'client') {
      await mergeGuestCartIntoUser(user, guestCart);
    }
    await user.save();

    const { code, expiresAt } = await upsertVerificationCode(email);
    try {
      await sendVerificationEmail({ to: email, code });
    } catch (err) {
      console.error('Failed to send verification email', err);
      throw badRequest('Unable to send verification email. Please try again later.');
    }

    const token = signAuthToken(user);
    setAuthCookie(res, token);

    res.status(201).json({
      user: user.toJSON(),
      requiresVerification: true,
      verification: { email, expiresAt: expiresAt.toISOString() },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const data = validateLogin(req.body || {});
    const email = data.email.toLowerCase();
    const guestCart = data.guestCart;

    const user = await User.findOne({ $or: [{ username: email }, { email }] });
    if (!user) {
      throw unauthorized('Invalid email or password');
    }
    if (user.status !== 'active') {
      throw unauthorized('Account is inactive');
    }

    const isValid = await comparePassword(data.password, user.passwordHash);
    if (!isValid) {
      throw unauthorized('Invalid email or password');
    }

    await mergeGuestCartIntoUser(user, guestCart);
    await user.save();

    const token = signAuthToken(user);
    setAuthCookie(res, token);

    const requiresVerification = user.role === 'client' && user.isEmailVerified === false;

    res.json({ user: user.toJSON(), requiresVerification });
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
    const payload = validateVerification(req.body || {});
    const email = payload.email.toLowerCase();

    const verification = await EmailVerification.findOne({ email });
    if (!verification) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (verification.attempts >= verification.maxAttempts) {
      return res.status(429).json({ error: 'Too many failed attempts. Please request a new verification code.' });
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      await EmailVerification.deleteOne({ email });
      return res.status(400).json({ error: 'Verification code expired. Please request a new code.' });
    }

    if (verification.code !== payload.code) {
      verification.attempts += 1;
      verification.lastAttemptAt = new Date();
      await verification.save();
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    const user = await User.findOne({ $or: [{ username: email }, { email }] });
    if (!user) {
      await EmailVerification.deleteOne({ email });
      return res.status(404).json({ error: 'Account not found. Please register again.' });
    }

    user.isEmailVerified = true;
    if (user.status !== 'active') {
      user.status = 'active';
    }
    await user.save();
    await EmailVerification.deleteOne({ email });

    res.json({ message: 'Account verified successfully.', user: user.toJSON() });
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
};

