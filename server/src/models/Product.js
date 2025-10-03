const mongoose = require('mongoose');

const allowedTags = ['in stock', 'out of stock', 'on sale', 'available to order'];

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    tags: {
      type: [String],
      enum: allowedTags,
      default: ['available to order'],
      validate: {
        validator: (tags) => new Set(tags).size === tags.length,
        message: 'Tags must be unique per product',
      },
    },
    description: {
      type: String,
      default: '',
    },
    images: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    attributes: {
      type: Map,
      of: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.categoryId = ret.categoryId ? ret.categoryId.toString() : null;
        ret.createdAt = ret.createdAt ? new Date(ret.createdAt).toISOString() : null;
        ret.updatedAt = ret.updatedAt ? new Date(ret.updatedAt).toISOString() : null;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

productSchema.statics.allowedTags = allowedTags;

module.exports = mongoose.model('Product', productSchema);
