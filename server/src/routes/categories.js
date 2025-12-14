const express = require('express');
const multer = require('multer');
const {
  listCategories,
  createCategory,
  updateCategory,
  getCategory,
  deleteCategory,
  uploadCategoryImage,
  uploadCategoryHeroImage,
} = require('../controllers/categoryController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { marketingImageUpload } = require('../middleware/upload');
const { badRequest } = require('../utils/appError');

const router = express.Router();

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

router.get('/', listCategories);
router.get('/:id', getCategory);
router.post(
  '/upload-image',
  requireAuth,
  requireRole(['super_admin', 'admin', 'staff']),
  handleMarketingImageUpload(uploadCategoryImage, 'Category image')
);
router.post(
  '/upload-hero-image',
  requireAuth,
  requireRole(['super_admin', 'admin', 'staff']),
  handleMarketingImageUpload(uploadCategoryHeroImage, 'Category hero image')
);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'staff']), createCategory);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'staff']), updateCategory);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin']), deleteCategory);

module.exports = router;
