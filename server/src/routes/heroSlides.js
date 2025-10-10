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
router.post('/', requireAuth, requireRole(['admin', 'manager', 'staff']), createHeroSlide);
router.put('/:id', requireAuth, requireRole(['admin', 'manager', 'staff']), updateHeroSlide);
router.delete('/:id', requireAuth, requireRole(['admin', 'manager']), deleteHeroSlide);

module.exports = router;

