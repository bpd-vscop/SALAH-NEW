const express = require('express');
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const { verificationUpload, profileUpload } = require('../middleware/upload');
const { uploadVerification, uploadProfileImage } = require('../controllers/uploadController');
const { badRequest } = require('../utils/appError');

const router = express.Router();

const handleUpload = (uploader, handler, maxMb) => (req, res, next) => {
  uploader.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          badRequest('File too large', [
            { code: 'file_too_large', limitMb: maxMb },
          ])
        );
      }
      return next(badRequest('Upload failed', [{ code: err.code }]));
    }
    if (err) {
      return next(err);
    }
    return handler(req, res, next);
  });
};

router.post(
  '/verification',
  requireAuth,
  requireRole(['client']),
  handleUpload(verificationUpload, uploadVerification, Number(process.env.UPLOAD_MAX_MB || 10))
);
router.post(
  '/profile-image',
  requireAuth,
  requireRole(['super_admin', 'admin', 'staff']),
  handleUpload(profileUpload, uploadProfileImage, Number(process.env.PROFILE_UPLOAD_MAX_MB || 5))
);

module.exports = router;
