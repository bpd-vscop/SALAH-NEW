const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for cleanup - remove expired tokens
passwordResetTokenSchema.index({ expiresAt: 1 });

// Index for finding active tokens
passwordResetTokenSchema.index({ userId: 1, used: false, expiresAt: 1 });

const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

module.exports = PasswordResetToken;
