const express = require('express');
const {
  listFeaturedShowcase,
  createFeaturedShowcase,
  updateFeaturedShowcase,
  deleteFeaturedShowcase,
} = require('../controllers/featuredShowcaseController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listFeaturedShowcase);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'staff']), createFeaturedShowcase);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'staff']), updateFeaturedShowcase);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin']), deleteFeaturedShowcase);

module.exports = router;

