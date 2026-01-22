const express = require('express');
const { getRates } = require('../controllers/shippingController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Rates endpoint - requires authentication
router.post('/rates', requireAuth, getRates);

module.exports = router;
