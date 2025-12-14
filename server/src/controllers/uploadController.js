const path = require('path');
const { badRequest } = require('../utils/appError');
const { safeUnlinkUploadsUrlPath, normalizePosixPath } = require('../services/mediaStorageService');

const resolveUploadsUrlFromStoredPath = (value) => {
  if (!value) {
    return null;
  }
  const normalized = normalizePosixPath(value);
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return null;
  }
  if (normalized.startsWith('/uploads/')) {
    return normalized;
  }
  return `/uploads/${normalized.replace(/^\/+/, '')}`;
};

const uploadVerification = async (req, res, next) => {
  try {
    if (!req.file) {
      throw badRequest('Verification file upload failed');
    }

    const userId = req.user?.id || req.user?._id?.toString?.();
    if (!userId) {
      throw badRequest('User context missing for verification upload');
    }

    const previousVerificationFileUrl = req.user.verificationFileUrl;
    const relativePath = path.posix.join('users', String(userId), 'verification', req.file.filename);
    req.user.verificationFileUrl = relativePath;
    await req.user.save();

    const previousUploadsUrl = resolveUploadsUrlFromStoredPath(previousVerificationFileUrl);
    const nextUploadsUrl = resolveUploadsUrlFromStoredPath(relativePath);
    if (previousUploadsUrl && previousUploadsUrl !== nextUploadsUrl) {
      await safeUnlinkUploadsUrlPath(previousUploadsUrl);
    }

    res.json({ verificationFileUrl: relativePath });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadVerification,
};
