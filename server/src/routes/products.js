const express = require('express');
const multer = require('multer');
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  uploadProductDocument,
  getVehicleCompatibilityOptions,
} = require('../controllers/productController');
const { requestRestockNotification } = require('../controllers/productNotificationController');
const { createReview, listProductReviews } = require('../controllers/reviewController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { productImageUpload, productDocumentUpload } = require('../middleware/upload');
const { badRequest } = require('../utils/appError');

const productImageLimitMb = Number(process.env.PRODUCT_IMAGE_UPLOAD_MAX_MB || 5);
const productDocumentLimitMb = Number(process.env.PRODUCT_DOCUMENT_UPLOAD_MAX_MB || 20);

const router = express.Router();

const handleProductImageUpload = (req, res, next) => {
  productImageUpload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          badRequest('Product images are too large', [{ limitMb: productImageLimitMb }])
        );
      }
      return next(badRequest('Product image upload failed', [{ code: err.code }]));
    }
    if (err) {
      return next(err);
    }
    return uploadProductImage(req, res, next);
  });
};

const handleProductDocumentUpload = (req, res, next) => {
  productDocumentUpload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(badRequest('Product document is too large', [{ limitMb: productDocumentLimitMb }]));
      }
      return next(badRequest('Product document upload failed', [{ code: err.code }]));
    }
    if (err) {
      return next(err);
    }
    return uploadProductDocument(req, res, next);
  });
};

router.get('/', listProducts);
router.get('/vehicle-compatibility-options', getVehicleCompatibilityOptions);
router.get('/:id/reviews', listProductReviews);
router.get('/:id', getProduct);
router.post('/:id/notify', requireAuth, requireRole(['client']), requestRestockNotification);
router.post('/:id/reviews', requireAuth, requireRole(['client', 'super_admin', 'admin', 'staff']), createReview);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'staff']), createProduct);
router.post(
  '/upload-image',
  requireAuth,
  requireRole(['super_admin', 'admin', 'staff']),
  handleProductImageUpload
);
router.post(
  '/upload-document',
  requireAuth,
  requireRole(['super_admin', 'admin', 'staff']),
  handleProductDocumentUpload
);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'staff']), updateProduct);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin']), deleteProduct);

module.exports = router;
