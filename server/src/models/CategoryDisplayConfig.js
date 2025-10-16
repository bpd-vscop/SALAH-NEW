const mongoose = require('mongoose');

const categoryDisplayConfigSchema = new mongoose.Schema(
  {
    homepageCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    allCategoriesHeroImage: {
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
        ret.homepageCategories = Array.isArray(ret.homepageCategories)
          ? ret.homepageCategories.map((id) => (id ? id.toString() : null)).filter(Boolean)
          : [];
        ret.allCategoriesHeroImage = ret.allCategoriesHeroImage || null;
        ret.updatedAt = ret.updatedAt ? new Date(ret.updatedAt).toISOString() : null;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('CategoryDisplayConfig', categoryDisplayConfigSchema);
