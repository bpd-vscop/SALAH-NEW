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

// Password Reset Routes
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/:token', authController.validateResetToken);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
