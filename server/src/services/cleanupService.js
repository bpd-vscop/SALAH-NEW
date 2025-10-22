const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const PasswordResetToken = require('../models/PasswordResetToken');

const UNVERIFIED_ACCOUNT_EXPIRY_DAYS = Number(process.env.UNVERIFIED_ACCOUNT_EXPIRY_DAYS || 15);

/**
 * Clean up unverified client accounts older than the specified expiry days.
 * This runs periodically to remove abandoned registrations.
 */
const cleanupUnverifiedAccounts = async () => {
  try {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - UNVERIFIED_ACCOUNT_EXPIRY_DAYS);

    const result = await User.deleteMany({
      role: 'client',
      isEmailVerified: false,
      accountCreated: { $lt: expiryDate },
    });

    if (result.deletedCount > 0) {
      console.log(`[Cleanup] Removed ${result.deletedCount} unverified accounts older than ${UNVERIFIED_ACCOUNT_EXPIRY_DAYS} days.`);
    }

    // Also clean up orphaned verification codes
    const codeCleanup = await VerificationCode.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    if (codeCleanup.deletedCount > 0) {
      console.log(`[Cleanup] Removed ${codeCleanup.deletedCount} expired verification codes.`);
    }

    // Clean up expired password reset tokens
    const resetTokenCleanup = await PasswordResetToken.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    if (resetTokenCleanup.deletedCount > 0) {
      console.log(`[Cleanup] Removed ${resetTokenCleanup.deletedCount} expired password reset tokens.`);
    }
  } catch (error) {
    console.error('[Cleanup] Error during cleanup:', error);
  }
};

/**
 * Start the cleanup service that runs periodically
 * @param {number} intervalHours - How often to run cleanup (default: 24 hours)
 */
const startCleanupService = (intervalHours = 24) => {
  // Run immediately on startup
  cleanupUnverifiedAccounts();

  // Then run periodically
  const intervalMs = intervalHours * 60 * 60 * 1000;
  setInterval(cleanupUnverifiedAccounts, intervalMs);

  console.log(`[Cleanup] Service started. Running every ${intervalHours} hours.`);
};

module.exports = {
  cleanupUnverifiedAccounts,
  startCleanupService,
  UNVERIFIED_ACCOUNT_EXPIRY_DAYS,
};
