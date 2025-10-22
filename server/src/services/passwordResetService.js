const crypto = require('crypto');
const PasswordResetToken = require('../models/PasswordResetToken');
const User = require('../models/User');
const { hashPassword } = require('../utils/password');
const { sendPasswordResetEmail } = require('./emailService');

const RESET_TOKEN_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);
const RESET_CODE_LENGTH = 6;

/**
 * Generate a secure random token
 */
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate a 6-digit code
 */
const generateCode = () => {
  const upperBound = 10 ** RESET_CODE_LENGTH;
  return crypto.randomInt(0, upperBound).toString().padStart(RESET_CODE_LENGTH, '0');
};

const normalizeOrigin = (origin) => {
  if (!origin || typeof origin !== 'string') {
    return null;
  }

  let value = origin.trim();
  if (!value) {
    return null;
  }

  // Fix missing colon in protocol declarations like "https//domain.com"
  if (/^https?(?=\/\/)/i.test(value) && !/^https?:\/\//i.test(value)) {
    value = value.replace(/^https?/i, (match) => `${match}:`);
  }

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value.replace(/^\/+/, '')}`;
  }

  return value.replace(/\/+$/, '');
};

const getResetBaseUrl = () => {
  const raw = process.env.CLIENT_ORIGIN || '';
  const candidates = raw
    .split(',')
    .map((candidate) => normalizeOrigin(candidate))
    .filter(Boolean);

  if (candidates.length === 0) {
    return null;
  }

  return candidates.find((candidate) => candidate.startsWith('https://')) || candidates[0];
};

const buildResetUrl = (token) => {
  const base = getResetBaseUrl();
  if (!base) {
    throw new Error('CLIENT_ORIGIN must include at least one valid URL to build the password reset link.');
  }
  return `${base}/reset-password/${token}`;
};

/**
 * Create a password reset request
 * @param {string} email - User's email address
 * @returns {Promise<{token: string, code: string, expiresAt: Date}>}
 */
const createPasswordReset = async (email) => {
  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail, role: 'client' });

  if (!user) {
    return null;
  }

  // Invalidate any existing unused tokens for this user
  await PasswordResetToken.updateMany(
    { userId: user._id, used: false },
    { used: true, usedAt: new Date() }
  );

  const token = generateToken();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  const resetToken = await PasswordResetToken.create({
    userId: user._id,
    token,
    code,
    expiresAt,
    used: false,
  });

  // Send email with both link and code
  let resetUrl;
  try {
    resetUrl = buildResetUrl(token);
  } catch (error) {
    await PasswordResetToken.deleteOne({ _id: resetToken._id });
    throw error;
  }

  try {
    await sendPasswordResetEmail({
      email: user.email,
      fullName: user.name,
      resetUrl,
      code,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    });
  } catch (error) {
    await PasswordResetToken.deleteOne({ _id: resetToken._id });
    throw error;
  }

  return {
    token: resetToken.token,
    code: process.env.NODE_ENV !== 'production' ? resetToken.code : undefined,
    expiresAt: resetToken.expiresAt,
  };
};

/**
 * Validate a reset token (magic link)
 * @param {string} token - Reset token
 * @returns {Promise<{valid: boolean, userId: string}>}
 */
const validateResetToken = async (token) => {
  const resetToken = await PasswordResetToken.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) {
    return { valid: false };
  }

  return {
    valid: true,
    userId: resetToken.userId.toString(),
  };
};

/**
 * Validate a reset code (6-digit)
 * @param {string} email - User's email
 * @param {string} code - 6-digit code
 * @returns {Promise<{valid: boolean, token: string}>}
 */
const validateResetCode = async (email, code) => {
  const user = await User.findOne({ email: email.toLowerCase(), role: 'client' });

  if (!user) {
    return { valid: false };
  }

  const resetToken = await PasswordResetToken.findOne({
    userId: user._id,
    code,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) {
    return { valid: false };
  }

  return {
    valid: true,
    token: resetToken.token, // Return token for next step
  };
};

/**
 * Reset password using token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
const resetPassword = async (token, newPassword) => {
  const resetToken = await PasswordResetToken.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) {
    throw new Error('Invalid or expired reset token.');
  }

  const user = await User.findById(resetToken.userId);

  if (!user) {
    throw new Error('User not found.');
  }

  // Update password hash
  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  // Mark token as used
  resetToken.used = true;
  resetToken.usedAt = new Date();
  await resetToken.save();
};

/**
 * Cleanup expired reset tokens
 * @returns {Promise<number>} Number of tokens deleted
 */
const cleanupExpiredTokens = async () => {
  const result = await PasswordResetToken.deleteMany({
    expiresAt: { $lt: new Date() },
  });

  return result.deletedCount || 0;
};

module.exports = {
  createPasswordReset,
  validateResetToken,
  validateResetCode,
  resetPassword,
  cleanupExpiredTokens,
};
