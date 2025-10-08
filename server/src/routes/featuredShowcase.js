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
router.post('/', requireAuth, requireRole(['admin', 'manager', 'staff']), createFeaturedShowcase);
router.put('/:id', requireAuth, requireRole(['admin', 'manager', 'staff']), updateFeaturedShowcase);
router.delete('/:id', requireAuth, requireRole(['admin', 'manager']), deleteFeaturedShowcase);

module.exports = router;

