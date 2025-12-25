const express = require('express');
const { getWishlist, updateWishlist } = require('../controllers/wishlistController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', getWishlist);
router.put('/', requireRole(['client']), updateWishlist);

module.exports = router;
