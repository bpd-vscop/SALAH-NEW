const express = require('express');
const {
  listHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
} = require('../controllers/heroSlideController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listHeroSlides);
router.post('/', requireAuth, requireRole(['super_admin', 'admin', 'staff']), createHeroSlide);
router.put('/:id', requireAuth, requireRole(['super_admin', 'admin', 'staff']), updateHeroSlide);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin']), deleteHeroSlide);

module.exports = router;

