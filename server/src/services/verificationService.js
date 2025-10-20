const crypto = require('crypto');
const EmailVerificationCode = require('../models/EmailVerificationCode');
const { hashPassword, comparePassword } = require('../utils/password');
const { sendVerificationEmail } = require('./emailService');

const EXPIRY_MINUTES = Number(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES || 15);

const generateCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

const createOrReplaceVerification = async (email) => {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);
  const codeHash = await hashPassword(code);

  await EmailVerificationCode.findOneAndDelete({ email });
  await EmailVerificationCode.create({ email, codeHash, expiresAt, attempts: 0, lastSentAt: new Date() });

  await sendVerificationEmail({ to: email, code, expiresAt });

  return { expiresAt };
};

const verifyEmailCode = async (email, code) => {
  const record = await EmailVerificationCode.findOne({ email });
  if (!record) {
    return { status: 'not_found' };
  }

  if (record.attempts >= record.maxAttempts) {
    return { status: 'too_many_attempts' };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { status: 'expired' };
  }

  const matches = await comparePassword(code, record.codeHash);
  if (!matches) {
    record.attempts += 1;
    await record.save();
    if (record.attempts >= record.maxAttempts) {
      return { status: 'too_many_attempts' };
    }
    return { status: 'invalid' };
  }

  await EmailVerificationCode.deleteMany({ email });
  return { status: 'verified' };
};

const resendVerificationCode = async (email) => {
  return createOrReplaceVerification(email);
};

module.exports = {
  createOrReplaceVerification,
  verifyEmailCode,
  resendVerificationCode,
};
