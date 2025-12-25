const express = require('express');
const {
  listReviewerNames,
  createReviewerName,
  deleteReviewerName,
} = require('../controllers/reviewerNameController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole(['super_admin', 'admin', 'staff']));
router.get('/', listReviewerNames);
router.post('/', createReviewerName);
router.delete('/:id', deleteReviewerName);

module.exports = router;
