const { normalizeWishlistItems } = require('../services/wishlistService');
const { badRequest } = require('../utils/appError');

const getWishlist = (req, res) => {
  if (req.user?.role !== 'client') {
    return res.json({ wishlist: [] });
  }
  res.json({ wishlist: req.user.toJSON().wishlist });
};

const updateWishlist = async (req, res, next) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items)) {
      throw badRequest('Wishlist items must be an array');
    }

    const sanitized = await normalizeWishlistItems(items);
    req.user.wishlist = sanitized;
    await req.user.save();

    res.json({ wishlist: req.user.toJSON().wishlist });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  updateWishlist,
};
