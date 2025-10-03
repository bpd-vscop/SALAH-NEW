const express = require('express');
const { getCart, updateCart } = require('../controllers/cartController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', getCart);
router.put('/', requireRole(['client']), updateCart);

module.exports = router;
