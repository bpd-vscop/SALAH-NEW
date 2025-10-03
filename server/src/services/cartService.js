const mongoose = require('mongoose');
const Product = require('../models/Product');

const normalizeCartItems = async (cartPayload = []) => {
  const valid = [];
  const ids = [];

  cartPayload.forEach((item) => {
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

const mergeCartItems = (existingCart = [], incomingCart = []) => {
  const mergedMap = new Map();

  existingCart.forEach((item) => {
    mergedMap.set(item.productId.toString(), {
      productId: item.productId,
      quantity: item.quantity,
    });
  });

  incomingCart.forEach((item) => {
    const key = item.productId.toString();
    if (mergedMap.has(key)) {
      mergedMap.get(key).quantity += item.quantity;
    } else {
      mergedMap.set(key, { productId: item.productId, quantity: item.quantity });
    }
  });

  return Array.from(mergedMap.values());
};

const mergeGuestCartIntoUser = async (userDoc, guestCartPayload) => {
  const sanitizedIncoming = await normalizeCartItems(guestCartPayload);
  if (!sanitizedIncoming.length) {
    return userDoc.cart;
  }
  const merged = mergeCartItems(userDoc.cart, sanitizedIncoming);
  userDoc.cart = merged;
  return merged;
};

module.exports = {
  normalizeCartItems,
  mergeCartItems,
  mergeGuestCartIntoUser,
};
