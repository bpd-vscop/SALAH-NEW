const express = require('express');
const {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} = require('../controllers/bannerController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listBanners);
router.post('/', requireAuth, requireRole(['admin', 'manager', 'staff']), createBanner);
router.put('/:id', requireAuth, requireRole(['admin', 'manager', 'staff']), updateBanner);
router.delete('/:id', requireAuth, requireRole(['admin', 'manager']), deleteBanner);

module.exports = router;
