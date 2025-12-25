const express = require('express');
const { getWishlist, updateWishlist } = require('../controllers/wishlistController');

const router = express.Router();

router.get('/', getWishlist);
router.put('/', updateWishlist);

module.exports = router;
