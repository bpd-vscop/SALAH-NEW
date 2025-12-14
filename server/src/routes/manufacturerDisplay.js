const express = require('express');
const multer = require('multer');
const { getManufacturerDisplay, updateManufacturerDisplay, uploadManufacturerDisplayHeroImage } = require('../controllers/manufacturerDisplayController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { marketingImageUpload } = require('../middleware/upload');
const { badRequest } = require('../utils/appError');

const router = express.Router();

router.get('/', getManufacturerDisplay);

const marketingImageLimitMb = Number(process.env.MARKETING_IMAGE_UPLOAD_MAX_MB || 5);

const handleMarketingImageUpload = (handler, label) => (req, res, next) => {
  marketingImageUpload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(badRequest(`${label} is too large`, [{ limitMb: marketingImageLimitMb }]));
      }
      return next(badRequest(`${label} upload failed`, [{ code: err.code }]));
    }
    if (err) {
      return next(err);
    }
    return handler(req, res, next);
  });
};

router.post(
  '/upload-hero-image',
  requireAuth,
  requireRole(['super_admin', 'admin', 'staff']),
  handleMarketingImageUpload(uploadManufacturerDisplayHeroImage, 'Manufacturer display hero image')
);
router.put('/', requireAuth, requireRole(['super_admin', 'admin', 'staff']), updateManufacturerDisplay);

module.exports = router;
