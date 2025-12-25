const mongoose = require('mongoose');

const guestWishlistItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const guestWishlistSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [guestWishlistItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.items = Array.isArray(ret.items)
          ? ret.items.map((item) => ({
              productId: item.productId ? item.productId.toString() : null,
              quantity: item.quantity,
            }))
          : [];
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

module.exports = mongoose.model('GuestWishlist', guestWishlistSchema);
