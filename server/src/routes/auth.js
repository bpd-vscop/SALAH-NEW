const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.currentUser);
router.post('/change-password', requireAuth, authController.changePassword);
router.post('/verify', authController.verifyRegistration);
router.post('/resend-code', authController.resendVerificationCode);

module.exports = router;
