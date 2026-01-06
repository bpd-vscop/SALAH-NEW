const express = require('express');
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const { marketingImageUpload } = require('../middleware/upload');
const { badRequest } = require('../utils/appError');
const {
  listDownloads,
  getDownloadBySlug,
  createDownload,
  updateDownload,
  deleteDownload,
  uploadDownloadImage,
} = require('../controllers/downloadController');

const router = express.Router();

const marketingImageLimitMb = Number(process.env.MARKETING_IMAGE_UPLOAD_MAX_MB || 5);

const handleDownloadImageUpload = (req, res, next) => {
  marketingImageUpload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(badRequest('Download image is too large', [{ limitMb: marketingImageLimitMb }]));
      }
      return next(badRequest('Download image upload failed', [{ code: err.code }]));
    }
    if (err) {
      return next(err);
    }
    return uploadDownloadImage(req, res, next);
  });
};

router.get('/', listDownloads);
router.get('/slug/:slug', getDownloadBySlug);
router.post('/upload-image', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), handleDownloadImageUpload);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), createDownload);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager', 'staff']), updateDownload);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin', 'manager']), deleteDownload);

module.exports = router;
