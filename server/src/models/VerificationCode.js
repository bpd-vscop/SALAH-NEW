const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    code: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['registration', 'password-change', 'password-reset'],
      default: 'registration',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for email and type to allow multiple codes per email (different purposes)
verificationCodeSchema.index({ email: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
