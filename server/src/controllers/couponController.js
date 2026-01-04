const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const { validateCreateCoupon, validateUpdateCoupon, validateApplyCoupon } = require('../validators/coupon');
const { badRequest, notFound } = require('../utils/appError');

const normalizeIds = (ids) => {
  if (!Array.isArray(ids)) return [];
  return Array.from(new Set(ids.filter(Boolean).map((id) => id.toString())));
};

const listCoupons = async (_req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ coupons: coupons.map((coupon) => coupon.toJSON()) });
  } catch (err) {
    next(err);
  }
};

const createCoupon = async (req, res, next) => {
  try {
    const data = validateCreateCoupon(req.body || {});
    const existing = await Coupon.findOne({ code: data.code });
    if (existing) {
      throw badRequest('Coupon code already exists');
    }

    const coupon = await Coupon.create({
      code: data.code,
      type: data.type,
      amount: data.amount,
      isActive: data.isActive !== false,
      categoryIds: normalizeIds(data.categoryIds),
      productIds: normalizeIds(data.productIds),
    });

    res.status(201).json({ coupon: coupon.toJSON() });
  } catch (err) {
    next(err);
  }
};

const updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateCoupon(req.body || {});
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw notFound('Coupon not found');
    }

    if (typeof data.code !== 'undefined' && data.code !== coupon.code) {
      const exists = await Coupon.findOne({ code: data.code, _id: { $ne: id } });
      if (exists) {
        throw badRequest('Coupon code already exists');
      }
      coupon.code = data.code;
    }

    if (typeof data.type !== 'undefined') coupon.type = data.type;
    if (typeof data.amount !== 'undefined') coupon.amount = data.amount;
    if (typeof data.isActive !== 'undefined') coupon.isActive = data.isActive;
    if (typeof data.categoryIds !== 'undefined') coupon.categoryIds = normalizeIds(data.categoryIds);
    if (typeof data.productIds !== 'undefined') coupon.productIds = normalizeIds(data.productIds);

    if (coupon.type === 'percentage' && coupon.amount > 100) {
      throw badRequest('Percentage discounts cannot exceed 100');
    }

    await coupon.save();
    res.json({ coupon: coupon.toJSON() });
  } catch (err) {
    next(err);
  }
};

const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      throw notFound('Coupon not found');
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

const applyCoupon = async (req, res, next) => {
  try {
    const data = validateApplyCoupon(req.body || {});
    const coupon = await Coupon.findOne({ code: data.code });
    if (!coupon || !coupon.isActive) {
      throw badRequest('Coupon is invalid or inactive');
    }

    const items = data.items || [];
    const requestedIds = items.map((item) => item.productId);
    const products = await Product.find(
      { _id: { $in: requestedIds } },
      '_id price categoryId categoryIds'
    );
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    const appliesToAll = !coupon.categoryIds.length && !coupon.productIds.length;
    const couponProductIds = new Set(coupon.productIds.map((id) => id.toString()));
    const couponCategoryIds = new Set(coupon.categoryIds.map((id) => id.toString()));

    let subtotal = 0;
    let eligibleSubtotal = 0;
    const eligibleProductIds = new Set();

    items.forEach((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        return;
      }
      const quantity = item.quantity;
      const unitPrice = typeof product.price === 'number' ? product.price : 0;
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      let isEligible = appliesToAll || couponProductIds.has(product._id.toString());

      if (!isEligible && couponCategoryIds.size > 0) {
        const productCategoryIds = new Set(
          [
            product.categoryId ? product.categoryId.toString() : null,
            ...(Array.isArray(product.categoryIds) ? product.categoryIds.map((id) => id.toString()) : []),
          ].filter(Boolean)
        );
        isEligible = Array.from(productCategoryIds).some((categoryId) => couponCategoryIds.has(categoryId));
      }

      if (isEligible) {
        eligibleSubtotal += lineTotal;
        eligibleProductIds.add(product._id.toString());
      }
    });

    if (eligibleSubtotal <= 0) {
      throw badRequest('Coupon does not apply to any items in your cart');
    }

    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (eligibleSubtotal * coupon.amount) / 100;
    } else {
      discountAmount = Math.min(coupon.amount, eligibleSubtotal);
    }
    discountAmount = Math.round(discountAmount * 100) / 100;

    res.json({
      coupon: coupon.toJSON(),
      subtotal,
      eligibleSubtotal,
      discountAmount,
      eligibleProductIds: Array.from(eligibleProductIds),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
};
