const mongoose = require('mongoose');

const taxRateSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      trim: true,
      default: null,
    },
    state: {
      type: String,
      trim: true,
      default: null,
    },
    countryKey: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    stateKey: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    rate: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.country = ret.country || null;
        ret.state = ret.state || null;
        ret.rate = typeof ret.rate === 'number' ? ret.rate : 0;
        ret.createdAt = ret.createdAt ? new Date(ret.createdAt).toISOString() : null;
        ret.updatedAt = ret.updatedAt ? new Date(ret.updatedAt).toISOString() : null;
        delete ret._id;
        delete ret.__v;
        delete ret.countryKey;
        delete ret.stateKey;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('TaxRate', taxRateSchema);
