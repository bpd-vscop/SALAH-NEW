const path = require('path');
const { badRequest } = require('../utils/appError');

const uploadVerification = async (req, res, next) => {
  try {
    if (!req.file) {
      throw badRequest('Verification file upload failed');
    }

    const relativePath = path.posix.join('/uploads/verification', req.file.filename);
    req.user.verificationFileUrl = relativePath;
    await req.user.save();

    res.json({ verificationFileUrl: relativePath });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadVerification,
};
