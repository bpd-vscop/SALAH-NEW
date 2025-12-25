const crypto = require('crypto');
const { normalizeWishlistItems } = require('../services/wishlistService');
const GuestWishlist = require('../models/GuestWishlist');
const { badRequest } = require('../utils/appError');

const GUEST_WISHLIST_COOKIE = process.env.GUEST_WISHLIST_COOKIE || 'guest_wishlist';

const getGuestCookieOptions = () => {
  const secureEnv = process.env.AUTH_COOKIE_SECURE;
  const sameSiteEnv = process.env.AUTH_COOKIE_SAMESITE || 'lax';
  return {
    httpOnly: true,
    secure: secureEnv === 'true',
    sameSite: sameSiteEnv,
    maxAge: 1000 * 60 * 60 * 24 * 365,
    path: '/',
  };
};

const getOrCreateGuestWishlist = async (req, res) => {
  const tokenFromCookie = req.cookies?.[GUEST_WISHLIST_COOKIE];
  let wishlist = null;
  if (tokenFromCookie) {
    wishlist = await GuestWishlist.findOne({ token: tokenFromCookie });
  }

  if (!wishlist) {
    const token = crypto.randomBytes(24).toString('hex');
    wishlist = await GuestWishlist.create({ token, items: [] });
    res.cookie(GUEST_WISHLIST_COOKIE, token, getGuestCookieOptions());
  }

  return wishlist;
};

const getWishlist = async (req, res, next) => {
  try {
    if (req.user?.role === 'client') {
      return res.json({ wishlist: req.user.toJSON().wishlist });
    }
    const wishlist = await getOrCreateGuestWishlist(req, res);
    return res.json({ wishlist: wishlist.toJSON().items });
  } catch (error) {
    return next(error);
  }
};

const updateWishlist = async (req, res, next) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items)) {
      throw badRequest('Wishlist items must be an array');
    }

    const sanitized = await normalizeWishlistItems(items);

    if (req.user?.role === 'client') {
      req.user.wishlist = sanitized;
      await req.user.save();
      return res.json({ wishlist: req.user.toJSON().wishlist });
    }

    const wishlist = await getOrCreateGuestWishlist(req, res);
    wishlist.items = sanitized;
    await wishlist.save();
    return res.json({ wishlist: wishlist.toJSON().items });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getWishlist,
  updateWishlist,
};
