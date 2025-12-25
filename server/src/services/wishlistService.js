const mongoose = require('mongoose');
const Product = require('../models/Product');

const normalizeWishlistItems = async (wishlistPayload = []) => {
  const valid = [];
  const ids = [];

  wishlistPayload.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }
    const { productId, quantity } = item;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return;
    }
    const normalizedQuantity = Number.isFinite(Number(quantity)) ? Math.max(1, Math.round(Number(quantity))) : 1;
    valid.push({ productId, quantity: normalizedQuantity });
    ids.push(productId);
  });

  if (!valid.length) {
    return [];
  }

  const products = await Product.find({ _id: { $in: ids } }, '_id');
  const existingIds = new Set(products.map((p) => p._id.toString()));

  return valid.filter((item) => existingIds.has(item.productId));
};

module.exports = {
  normalizeWishlistItems,
};
