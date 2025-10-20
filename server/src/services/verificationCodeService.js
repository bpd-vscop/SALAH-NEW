const VerificationCode = require('../models/VerificationCode');
const { sendClientVerificationEmail } = require('./emailService');

const VERIFICATION_CODE_TTL_MINUTES = Number(process.env.VERIFICATION_CODE_TTL_MINUTES || 15);

const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

const issueVerificationCode = async ({ email, fullName, clientType }) => {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60 * 1000);

  await VerificationCode.findOneAndUpdate(
    { email },
    {
      email,
      code,
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
    await VerificationCode.deleteOne({ email });
    throw error;
  }

  const previewCode = process.env.NODE_ENV !== 'production' ? code : undefined;

  return { code, expiresAt, previewCode };
};

module.exports = {
  issueVerificationCode,
  VERIFICATION_CODE_TTL_MINUTES,
};
