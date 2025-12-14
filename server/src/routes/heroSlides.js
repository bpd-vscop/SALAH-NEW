const express = require('express');
const multer = require('multer');
const {
  listHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  uploadHeroDesktopImage,
  uploadHeroMobileImage,
} = require('../controllers/heroSlideController');
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

router.get('/', listHeroSlides);
router.post(
  '/upload-desktop-image',
  requireAuth,
  requireRole(['super_admin', 'admin', 'staff']),
  handleMarketingImageUpload(uploadHeroDesktopImage, 'Desktop hero image')
);
router.post(
  '/upload-mobile-image',
  requireAuth,
  requireRole(['super_admin', 'admin', 'staff']),
  handleMarketingImageUpload(uploadHeroMobileImage, 'Mobile hero image')
);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'staff']), createHeroSlide);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'staff']), updateHeroSlide);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin']), deleteHeroSlide);

module.exports = router;
