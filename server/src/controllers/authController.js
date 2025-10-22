const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const { hashPassword, comparePassword } = require('../utils/password');
const { validateRegister, validateLogin, validateChangePassword, validateVerificationCode } = require('../validators/auth');
const { mergeGuestCartIntoUser } = require('../services/cartService');
const { badRequest, unauthorized } = require('../utils/appError');
const { signAuthToken, getCookieOptions, getAuthCookieName } = require('../config/jwt');
const { sanitizeUsernameBase, ensureUniqueUsername } = require('../utils/username');
const { issueVerificationCode } = require('../services/verificationCodeService');
const passwordResetService = require('../services/passwordResetService');

const MAX_VERIFICATION_ATTEMPTS = Number(process.env.VERIFICATION_MAX_ATTEMPTS || 5);
const VERIFICATION_LOCK_MINUTES = Number(process.env.VERIFICATION_LOCK_MINUTES || 15);

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
    const data = validateRegister(payload);

    const fullName = data.name.trim();
    const email = data.email.toLowerCase();

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      throw badRequest('Email already in use', [{ field: 'email' }]);
    }

    const preferredBase = data.username
      ? sanitizeUsernameBase(data.username, 'client')
      : sanitizeUsernameBase(email.split('@')[0] || fullName, 'client');
    const username = await ensureUniqueUsername(preferredBase);

    const passwordHash = await hashPassword(data.password);

    const user = new User({
      name: fullName,
      username,
      email,
      passwordHash,
      role: 'client',
      isEmailVerified: true,
    });

    // Only clients maintain shopping carts; ignore guest cart for staff/admin roles
    if (user.role === 'client') {
      await mergeGuestCartIntoUser(user, guestCart);
    }
    await user.save();

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
    const identifierRaw = data.username.trim();
    const identifier = identifierRaw.toLowerCase();
    const query = identifierRaw.includes('@')
      ? { email: identifier }
      : { username: identifier };

    const user = await User.findOne(query);
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

    // If client hasn't verified email, resend verification code and prompt them
    if (user.role === 'client' && user.isEmailVerified === false) {
      try {
        const { expiresAt, previewCode } = await issueVerificationCode({
          email: user.email,
          fullName: user.name,
          clientType: user.clientType || 'C2B',
        });

        return res.status(403).json({
          error: {
            message: 'Email verification required. A new verification code has been sent to your email.',
            code: 'EMAIL_VERIFICATION_REQUIRED',
          },
          email: user.email,
          expiresAt: expiresAt.toISOString(),
          requiresVerification: true,
          previewCode,
        });
      } catch (emailError) {
        console.error('Failed to resend verification email on login', emailError);
        throw unauthorized('Email verification required. Please contact support if you did not receive the verification email.');
      }
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

const verifyRegistration = async (req, res, next) => {
  try {
    const data = validateVerificationCode(req.body || {});
    const email = data.email.toLowerCase();

    const record = await VerificationCode.findOne({ email });
    if (!record) {
      throw badRequest('Invalid verification code.');
    }

    const now = new Date();
    if (record.lockedUntil && record.lockedUntil > now) {
      throw badRequest('Too many failed attempts. Please request a new verification code.');
    }
    if (record.expiresAt <= now) {
      await VerificationCode.deleteOne({ email });
      throw badRequest('Verification code expired. Please request a new code.');
    }

    if (record.code !== data.code) {
      record.attempts += 1;
      record.lastAttemptAt = now;
      if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
        record.lockedUntil = new Date(now.getTime() + VERIFICATION_LOCK_MINUTES * 60 * 1000);
      }
      await record.save();
      if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
        throw badRequest('Too many failed attempts. Please request a new verification code.');
      }
      throw badRequest('Invalid verification code.');
    }

    const user = await User.findOne({ email });
    if (!user) {
      await VerificationCode.deleteOne({ email });
      throw badRequest('Account not found for verification. Please register again.');
    }

    user.isEmailVerified = true;
    user.status = 'active';
    await user.save();

    await VerificationCode.deleteOne({ email });

    const token = signAuthToken(user);
    setAuthCookie(res, token);

    res.json({ user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

const resendVerificationCode = async (req, res, next) => {
  try {
    const rawEmail = req.body?.email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      throw badRequest('Email is required', [{ field: 'email' }]);
    }
    const email = rawEmail.trim().toLowerCase();
    if (!email) {
      throw badRequest('Email is required', [{ field: 'email' }]);
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw badRequest('No account found for this email address.');
    }
    if (user.isEmailVerified) {
      throw badRequest('This account is already verified.');
    }

    let result;
    try {
      result = await issueVerificationCode({
        email,
        fullName: user.name || '',
        clientType: user.clientType || 'C2B',
      });
    } catch (emailError) {
      console.error('Failed to resend verification email', emailError);
      throw badRequest('Unable to resend verification email. Please try again later.');
    }

    res.json({
      email,
      expiresAt: result.expiresAt.toISOString(),
      requiresVerification: true,
      previewCode: result.previewCode,
    });
  } catch (error) {
    next(error);
  }
};

// Password Reset: Step 1 - Request reset (send email with link + code)
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      throw badRequest('Email is required.');
    }

    const result = await passwordResetService.createPasswordReset(email.trim());

    res.json({
      message: 'If an account exists with this email, you will receive a password reset link.',
      email: email.trim(),
      expiresAt: result.expiresAt,
      ...(result.code && { previewCode: result.code }), // Only in dev
    });
  } catch (error) {
    next(error);
  }
};

// Password Reset: Step 2a - Validate magic link token
const validateResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw badRequest('Reset token is required.');
    }

    const result = await passwordResetService.validateResetToken(token);

    if (!result.valid) {
      throw badRequest('Invalid or expired reset token.');
    }

    res.json({
      valid: true,
      token,
    });
  } catch (error) {
    next(error);
  }
};

// Password Reset: Step 2b - Validate 6-digit code (alternative to magic link)
const verifyResetCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      throw badRequest('Email and code are required.');
    }

    if (!/^\d{6}$/.test(code)) {
      throw badRequest('Code must be 6 digits.');
    }

    const result = await passwordResetService.validateResetCode(email.trim(), code.trim());

    if (!result.valid) {
      throw badRequest('Invalid or expired reset code.');
    }

    res.json({
      valid: true,
      token: result.token, // Return token for next step
    });
  } catch (error) {
    next(error);
  }
};

// Password Reset: Step 3 - Set new password
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw badRequest('Token and new password are required.');
    }

    if (newPassword.length < 8) {
      throw badRequest('Password must be at least 8 characters long.');
    }

    await passwordResetService.resetPassword(token, newPassword);

    res.json({
      message: 'Password reset successful. You can now log in with your new password.',
    });
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
  verifyRegistration,
  resendVerificationCode,
  forgotPassword,
  validateResetToken,
  verifyResetCode,
  resetPassword,
};


