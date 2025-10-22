const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const { hashPassword } = require('../utils/password');
const { badRequest } = require('../utils/appError');
const { validateClientRegistration } = require('../validators/clientRegistration');
const { issueVerificationCode } = require('../services/verificationCodeService');

const PENDING_VERIFICATION_RETENTION_MS = 15 * 24 * 60 * 60 * 1000;

const getAccountCreatedAt = (user) => {
  if (!user) {
    return null;
  }
  if (user.accountCreated instanceof Date) {
    return user.accountCreated;
  }
  if (user.createdAt instanceof Date) {
    return user.createdAt;
  }
  if (typeof user._id?.getTimestamp === 'function') {
    return user._id.getTimestamp();
  }
  return null;
};

const registerClient = async (req, res, next) => {
  try {
    const payload = validateClientRegistration(req.body || {});
    const email = payload.basicInfo.email.toLowerCase();
    const fullName = payload.basicInfo.fullName.trim();
    const passwordHash = await hashPassword(payload.basicInfo.password);

    let user = await User.findOne({ email });
    let createdNewUser = !user;
    if (user) {
      const accountCreatedAt = getAccountCreatedAt(user);
      const isPendingVerification = user.isEmailVerified === false;
      if (isPendingVerification) {
        const ageMs = accountCreatedAt ? Date.now() - accountCreatedAt.getTime() : 0;
        if (ageMs <= PENDING_VERIFICATION_RETENTION_MS) {
          throw badRequest('An account with this email already exists. Please log in to continue.', [
            { field: 'email' },
          ]);
        }
        await User.deleteOne({ _id: user._id });
        await VerificationCode.deleteOne({ email });
        user = null;
        createdNewUser = true;
      } else {
        throw badRequest('An account with this email already exists.', [{ field: 'email' }]);
      }
    }

    if (!user) {
      user = new User({
        name: fullName,
        email,
        role: 'client',
        status: 'active',
      });
    }

    user.name = fullName;
    user.email = email;
    user.clientType = payload.clientType;
    user.role = 'client';
    user.status = 'active';
    user.isEmailVerified = false;
    user.passwordHash = passwordHash;
    user.username = undefined;
    user.set('username', undefined);

    if (payload.clientType === 'B2B') {
      const companyName = payload.companyInfo?.companyName?.trim() || '';
      const companyPhone = payload.companyInfo?.companyPhone?.trim() || '';
      const companyBusinessType = payload.companyInfo?.businessType?.trim() || '';
      const companyTaxId = payload.companyInfo?.taxId?.trim() || '';
      const companyWebsite = payload.companyInfo?.companyWebsite?.trim() || '';
      const companyAddress = payload.companyInfo?.companyAddress?.trim() || '';

      user.company = {
        name: companyName || null,
        phone: companyPhone || null,
        businessType: companyBusinessType || null,
        taxId: companyTaxId || null,
        website: companyWebsite || null,
        address: companyAddress || null,
      };
    } else {
      user.company = undefined;
    }

    await user.save();

    try {
      const { expiresAt, previewCode } = await issueVerificationCode({
        email,
        fullName,
        clientType: payload.clientType,
      });

      res.status(201).json({
        email,
        clientType: payload.clientType,
        expiresAt: expiresAt.toISOString(),
        requiresVerification: true,
        previewCode,
      });
    } catch (emailError) {
      console.error('Failed to send verification email', emailError);
      if (createdNewUser) {
        await User.deleteOne({ _id: user._id });
      }
      throw badRequest('Unable to send verification email. Please try again later.');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerClient,
};
