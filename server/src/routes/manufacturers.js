const express = require('express');
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const { marketingImageUpload } = require('../middleware/upload');
const { badRequest } = require('../utils/appError');
const {
  listManufacturers,
  createManufacturer,
  updateManufacturer,
  deleteManufacturer,
  uploadManufacturerLogo,
  uploadManufacturerHero,
} = require('../controllers/manufacturerController');

const router = express.Router();

const marketingImageLimitMb = Number(process.env.MARKETING_IMAGE_UPLOAD_MAX_MB || 5);

const handleMarketingImageUpload = (fieldName, handler, label) => (req, res, next) => {
  marketingImageUpload.single(fieldName)(req, res, (err) => {
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

router.get('/', listManufacturers);
// Allow super_admin as well; 'manager' is kept for forward-compat though not present in enum
router.post(
  '/upload-logo',
  requireAuth,
  requireRole(['super_admin', 'admin', 'manager', 'staff']),
  handleMarketingImageUpload('image', uploadManufacturerLogo, 'Manufacturer logo')
);
router.post(
  '/upload-hero',
  requireAuth,
  requireRole(['super_admin', 'admin', 'manager', 'staff']),
  handleMarketingImageUpload('image', uploadManufacturerHero, 'Manufacturer hero image')
);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), createManufacturer);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), updateManufacturer);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager']), deleteManufacturer);

module.exports = router;
