const express = require('express');
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const { marketingImageUpload } = require('../middleware/upload');
const { badRequest } = require('../utils/appError');
const {
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  uploadBrandLogo,
} = require('../controllers/brandController');

const router = express.Router();

const marketingImageLimitMb = Number(process.env.MARKETING_IMAGE_UPLOAD_MAX_MB || 5);

const handleBrandLogoUpload = (req, res, next) => {
  marketingImageUpload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(badRequest('Logo image is too large', [{ limitMb: marketingImageLimitMb }]));
      }
      return next(badRequest('Logo image upload failed', [{ code: err.code }]));
    }
    if (err) {
      return next(err);
    }
    return uploadBrandLogo(req, res, next);
  });
};

router.get('/', listBrands);
router.post('/upload-logo', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), handleBrandLogoUpload);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), createBrand);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), updateBrand);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager']), deleteBrand);

module.exports = router;
