const express = require('express');
const {
    getPaymentConfig,
    createPaypalOrder,
    capturePaypalOrder,
    createStripePaymentIntent,
} = require('../controllers/paymentsController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Public: which payment methods are available
router.get('/config', getPaymentConfig);

// Authenticated: create orders
router.post('/paypal/create-order', requireAuth, createPaypalOrder);
router.post('/paypal/capture', requireAuth, capturePaypalOrder);
router.post('/stripe/create-intent', requireAuth, createStripePaymentIntent);

module.exports = router;
