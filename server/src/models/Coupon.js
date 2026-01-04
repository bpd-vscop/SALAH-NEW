const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    amount: {
      type: Number,
      min: 0,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    categoryIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category',
        },
      ],
      default: [],
    },
    productIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.categoryIds = Array.isArray(ret.categoryIds)
          ? ret.categoryIds.map((id) => id.toString())
          : [];
        ret.productIds = Array.isArray(ret.productIds)
          ? ret.productIds.map((id) => id.toString())
          : [];
        ret.createdAt = ret.createdAt ? new Date(ret.createdAt).toISOString() : null;
        ret.updatedAt = ret.updatedAt ? new Date(ret.updatedAt).toISOString() : null;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('Coupon', couponSchema);
