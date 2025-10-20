const express = require('express');
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const { verificationUpload, profileUpload } = require('../middleware/upload');
const { uploadVerification, uploadProfileImage } = require('../controllers/uploadController');
const { badRequest } = require('../utils/appError');

const router = express.Router();

const handleUpload = (req, res, next) => {
  verificationUpload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          badRequest('File too large', [
            { code: 'file_too_large', limitMb: Number(process.env.UPLOAD_MAX_MB || 10) },
          ])
        );
      }
      return next(badRequest('Upload failed', [{ code: err.code }]));
    }
    if (err) {
      return next(err);
    }
    return uploadVerification(req, res, next);
  });
};

router.post('/verification', requireAuth, requireRole(['client']), handleUpload);

const handleProfileUpload = (req, res, next) => {
  profileUpload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          badRequest('File too large', [
            { code: 'file_too_large', limitMb: Number(process.env.PROFILE_UPLOAD_MAX_MB || 5) },
          ])
        );
      }
      return next(badRequest('Upload failed', [{ code: err.code }]));
    }
    if (err) {
      return next(err);
    }
    return uploadProfileImage(req, res, next);
  });
};

router.post('/profile-image', requireAuth, requireRole(['super_admin', 'admin', 'staff']), handleProfileUpload);

module.exports = router;
