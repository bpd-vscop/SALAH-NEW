const express = require('express');
const {
  listReviews,
  createReview,
  updateReview,
  deleteReview,
  bulkDeleteReviews,
} = require('../controllers/reviewController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', listReviews);
router.post('/', requireRole(['super_admin', 'admin', 'staff']), createReview);
router.patch('/:id', requireRole(['super_admin', 'admin', 'staff']), updateReview);
router.delete('/:id', requireRole(['super_admin', 'admin', 'staff']), deleteReview);
router.post('/bulk-delete', requireRole(['super_admin', 'admin', 'staff']), bulkDeleteReviews);

module.exports = router;
