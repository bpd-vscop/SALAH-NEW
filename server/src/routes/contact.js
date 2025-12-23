const express = require('express');

const { sendContactEmail } = require('../controllers/contactController');

const router = express.Router();

router.post('/send-email', sendContactEmail);

module.exports = router;

