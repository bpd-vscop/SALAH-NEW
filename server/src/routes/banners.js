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
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'staff']), createBanner);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'staff']), updateBanner);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin']), deleteBanner);

module.exports = router;
