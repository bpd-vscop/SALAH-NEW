const mongoose = require('mongoose');

const manufacturerDisplayConfigSchema = new mongoose.Schema(
  {
    homepageManufacturers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Manufacturer',
      },
    ],
    allManufacturersHeroImage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.homepageManufacturers = Array.isArray(ret.homepageManufacturers)
          ? ret.homepageManufacturers
              .map((id) => (id ? id.toString() : null))
              .filter(Boolean)
          : [];
        ret.allManufacturersHeroImage = ret.allManufacturersHeroImage || null;
        ret.updatedAt = ret.updatedAt ? new Date(ret.updatedAt).toISOString() : null;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('ManufacturerDisplayConfig', manufacturerDisplayConfigSchema);

