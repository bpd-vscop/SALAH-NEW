const crypto = require('crypto');
const VerificationCode = require('../models/VerificationCode');
const { sendClientVerificationEmail, sendPasswordChangeEmail } = require('./emailService');

const VERIFICATION_CODE_TTL_MINUTES = Number(process.env.VERIFICATION_CODE_TTL_MINUTES || 15);

const generateCode = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

const issueVerificationCode = async ({ email, fullName, clientType }) => {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);

  await VerificationCode.findOneAndUpdate(
    { email, type: 'registration' },
    {
      email,
      code,
      type: 'registration',
      expiresAt,
      attempts: 0,
      lastAttemptAt: null,
      lockedUntil: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  try {
    await sendClientVerificationEmail({
      to: email,
      code,
      fullName,
      clientType,
      expiresInMinutes: VERIFICATION_CODE_TTL_MINUTES,
    });
  } catch (error) {
    await VerificationCode.deleteOne({ email, type: 'registration' });
    throw error;
  }

  const previewCode = process.env.NODE_ENV !== 'production' ? code : undefined;

  return { code, expiresAt, previewCode };
};

const issuePasswordChangeCode = async ({ email, fullName }) => {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);

  await VerificationCode.findOneAndUpdate(
    { email, type: 'password-change' },
    {
      email,
      code,
      type: 'password-change',
      expiresAt,
      attempts: 0,
      lastAttemptAt: null,
      lockedUntil: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  try {
    await sendPasswordChangeEmail({
      email,
      fullName,
      code,
      expiresInMinutes: VERIFICATION_CODE_TTL_MINUTES,
    });
  } catch (error) {
    await VerificationCode.deleteOne({ email, type: 'password-change' });
    throw error;
  }

  const previewCode = process.env.NODE_ENV !== 'production' ? code : undefined;

  return { code, expiresAt, previewCode };
};

const verifyPasswordChangeCode = async ({ email, code }) => {
  const record = await VerificationCode.findOne({ email, type: 'password-change' });

  if (!record) {
    return { valid: false, error: 'No verification code found for this email' };
  }

  if (record.lockedUntil && new Date() < record.lockedUntil) {
    return { valid: false, error: 'Too many attempts. Please try again later.' };
  }

  if (new Date() > record.expiresAt) {
    await VerificationCode.deleteOne({ email, type: 'password-change' });
    return { valid: false, error: 'Verification code has expired' };
  }

  if (record.code !== code) {
    record.attempts += 1;
    record.lastAttemptAt = new Date();

    // Lock after 5 failed attempts
    if (record.attempts >= 5) {
      record.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }

    await record.save();
    return { valid: false, error: 'Invalid verification code' };
  }

  // Code is valid - delete it so it can't be reused
  await VerificationCode.deleteOne({ email, type: 'password-change' });

  return { valid: true };
};

module.exports = {
  issueVerificationCode,
  issuePasswordChangeCode,
  verifyPasswordChangeCode,
  VERIFICATION_CODE_TTL_MINUTES,
};
