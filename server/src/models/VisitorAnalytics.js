const mongoose = require('mongoose');

const visitorAnalyticsSchema = new mongoose.Schema(
  {
    // Session and tracking
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    // Referrer tracking
    referrer: {
      type: String,
      default: null,
    },
    referrerSource: {
      type: String, // e.g., 'Google', 'Facebook', 'Direct', 'Instagram', etc.
      default: 'Direct',
      index: true,
    },

    // UTM parameters (marketing campaigns)
    utmSource: {
      type: String,
      default: null,
    },
    utmMedium: {
      type: String,
      default: null,
    },
    utmCampaign: {
      type: String,
      default: null,
    },
    utmTerm: {
      type: String,
      default: null,
    },
    utmContent: {
      type: String,
      default: null,
    },

    // Geographic location (from IP)
    ipAddress: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      default: null,
      index: true,
    },
    countryCode: {
      type: String,
      default: null,
    },
    region: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    timezone: {
      type: String,
      default: null,
    },

    // Device and browser info
    userAgent: {
      type: String,
      default: null,
    },
    deviceType: {
      type: String, // 'mobile', 'tablet', 'desktop'
      default: null,
    },
    browser: {
      type: String,
      default: null,
    },
    os: {
      type: String,
      default: null,
    },

    // Page visited
    landingPage: {
      type: String,
      required: true,
    },

    // User association (if logged in)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // Conversion tracking
    converted: {
      type: Boolean,
      default: false, // Set to true if user made a purchase
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Index for analytics queries
visitorAnalyticsSchema.index({ createdAt: -1 });
visitorAnalyticsSchema.index({ country: 1, createdAt: -1 });
visitorAnalyticsSchema.index({ referrerSource: 1, createdAt: -1 });
visitorAnalyticsSchema.index({ converted: 1, createdAt: -1 });

const VisitorAnalytics = mongoose.model('VisitorAnalytics', visitorAnalyticsSchema);

module.exports = VisitorAnalytics;
