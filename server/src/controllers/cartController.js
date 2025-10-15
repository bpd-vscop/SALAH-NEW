const { normalizeCartItems } = require('../services/cartService');
const { badRequest } = require('../utils/appError');

const getCart = (req, res) => {
  // Only return cart for client accounts; admins/staff don’t use cart
  if (req.user?.role !== 'client') {
    return res.json({ cart: [] });
  }
  res.json({ cart: req.user.toJSON().cart });
};

const updateCart = async (req, res, next) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items)) {
      throw badRequest('Cart items must be an array');
    }

    const sanitized = await normalizeCartItems(items);
    req.user.cart = sanitized;
    await req.user.save();

    res.json({ cart: req.user.toJSON().cart });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  updateCart,
};
