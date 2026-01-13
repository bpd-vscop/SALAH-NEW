const mongoose = require('mongoose');

const productRestockSubscriptionSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    notifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

productRestockSubscriptionSchema.index({ productId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ProductRestockSubscription', productRestockSubscriptionSchema);
