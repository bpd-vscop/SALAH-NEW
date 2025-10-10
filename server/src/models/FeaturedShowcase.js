const mongoose = require('mongoose');

const featuredShowcaseSchema = new mongoose.Schema(
  {
    variant: {
      type: String,
      enum: ['feature', 'tile'],
      default: 'tile',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: '',
      trim: true,
    },
    offer: {
      type: String,
      default: '',
      trim: true,
    },
    badgeText: {
      type: String,
      default: '',
      trim: true,
    },
    ctaText: {
      type: String,
      default: 'Shop Now',
      trim: true,
    },
    linkUrl: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    altText: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.createdAt = ret.createdAt ? new Date(ret.createdAt).toISOString() : null;
        ret.updatedAt = ret.updatedAt ? new Date(ret.updatedAt).toISOString() : null;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('FeaturedShowcase', featuredShowcaseSchema);

