const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const { validateCreateOrder, validateUpdateOrder } = require('../validators/order');
const { badRequest, notFound, forbidden } = require('../utils/appError');
const { extractCompanyLocation, findMatchingTaxRate } = require('../utils/taxRates');
const {
  sendOrderConfirmationEmail,
  sendAdminNewOrderEmail,
} = require('../services/emailService');

const ORDER_USER_SELECT =
  'name email phoneCode phoneNumber clientType status isEmailVerified company verificationFileUrl verificationStatus profileImage shippingAddresses accountCreated accountUpdated';

const specialInventoryStatuses = new Set(['backorder', 'preorder']);

const normalizeInventoryStatus = (inventory) => {
  if (!inventory || typeof inventory !== 'object') {
    return;
  }

  const quantity = typeof inventory.quantity === 'number' ? inventory.quantity : 0;
  const lowStockThreshold = typeof inventory.lowStockThreshold === 'number' ? inventory.lowStockThreshold : 0;
  const allowBackorder = Boolean(inventory.allowBackorder);

  // Manual overrides (admin-controlled)
  if (inventory.status === 'out_of_stock') {
    inventory.allowBackorder = false;
    return;
  }

  if (inventory.status === 'preorder') {
    inventory.allowBackorder = true;
    return;
  }

  if (specialInventoryStatuses.has(inventory.status)) {
    inventory.allowBackorder = true;
    if (quantity <= 0) {
      return;
    }
  }

  if (allowBackorder && quantity <= 0) {
    inventory.status = 'backorder';
    return;
  }

  if (quantity <= 0) {
    inventory.status = 'out_of_stock';
  } else if (quantity <= lowStockThreshold) {
    inventory.status = 'low_stock';
  } else {
    inventory.status = 'in_stock';
  }
};

const isInventoryOutOfStock = (inventory) => {
  const status = inventory?.status ?? 'in_stock';
  const allowBackorder = inventory?.allowBackorder ?? false;
  const quantity = typeof inventory?.quantity === 'number' ? inventory.quantity : 0;
  return status === 'out_of_stock' || (!allowBackorder && quantity <= 0);
};

const COMING_SOON_TAG = 'coming soon';
const NEW_ARRIVAL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const sanitizeProductTags = (product) => {
  if (!product) return;
  const currentTags = Array.isArray(product.tags) ? product.tags : [];
  const sanitized = currentTags.filter((tag) => tag === COMING_SOON_TAG);
  if (!Array.isArray(product.tags) || sanitized.length !== currentTags.length) {
    product.tags = sanitized;
    product.markModified('tags');
  }
};

const computeCouponDiscount = (coupon, items, productMap) => {
  const appliesToAll = !coupon.categoryIds.length && !coupon.productIds.length;
  const couponProductIds = new Set(coupon.productIds.map((id) => id.toString()));
  const couponCategoryIds = new Set(coupon.categoryIds.map((id) => id.toString()));

  let eligibleSubtotal = 0;

  items.forEach((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      return;
    }

    const quantity = item.quantity;
    const unitPrice = typeof product.price === 'number' ? product.price : 0;
    const lineTotal = unitPrice * quantity;

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

  return { discountAmount, eligibleSubtotal };
};

const isProductOnSale = (product) => {
  if (typeof product.salePrice !== 'number' || product.salePrice >= product.price) {
    return false;
  }
  const now = new Date();
  const startOk = product.saleStartDate ? now >= new Date(product.saleStartDate) : true;
  const endOk = product.saleEndDate ? now <= new Date(product.saleEndDate) : true;
  return startOk && endOk;
};

const isProductNewArrival = (product) => {
  if (product.restockedAt) {
    return false;
  }
  if (!product.createdAt) {
    return false;
  }
  const createdAt = new Date(product.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }
  const diff = Date.now() - createdAt.getTime();
  return diff >= 0 && diff <= NEW_ARRIVAL_DAYS * DAY_MS;
};

const isProductInStock = (product) => {
  if (product.manageStock === false) {
    return true;
  }
  const quantity = typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0;
  return quantity > 0;
};

const isProductOutOfStock = (product) => {
  if (product.manageStock === false) {
    return false;
  }
  const quantity = typeof product.inventory?.quantity === 'number' ? product.inventory.quantity : 0;
  return quantity <= 0;
};

const getOrderItemTags = (product) => {
  if (Array.isArray(product.tags) && product.tags.includes(COMING_SOON_TAG)) {
    return [COMING_SOON_TAG];
  }

  const tags = [];
  if (isProductOnSale(product)) {
    tags.push('on sale');
  }
  if (product.manageStock !== false && product.restockedAt && isProductInStock(product)) {
    tags.push('back in stock');
  }
  if (isProductNewArrival(product)) {
    tags.push('new arrival');
  }
  if (isProductOutOfStock(product)) {
    tags.push('out of stock');
  } else if (isProductInStock(product)) {
    tags.push('in stock');
  }
  return tags;
};

const listOrders = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'client') {
      filter.userId = req.user._id;
    }
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate({ path: 'userId', select: ORDER_USER_SELECT });
    res.json({ orders: orders.map((o) => o.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw notFound('Order not found');
    }

    const order = await Order.findById(id).populate({ path: 'userId', select: ORDER_USER_SELECT });
    if (!order) {
      throw notFound('Order not found');
    }

    const orderUserId = order.userId && typeof order.userId === 'object' ? order.userId._id : order.userId;
    if (req.user.role === 'client' && String(orderUserId) !== String(req.user._id)) {
      throw forbidden();
    }

    res.json({ order: order.toJSON() });
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const payload = validateCreateOrder(req.body || {});

    const requestedByProductId = new Map();
    payload.products.forEach((item) => {
      requestedByProductId.set(item.productId, (requestedByProductId.get(item.productId) || 0) + item.quantity);
    });

    const productIds = Array.from(requestedByProductId.keys());
    const products = await Product.find({ _id: { $in: productIds } });
    const foundProducts = new Map(products.map((p) => [p._id.toString(), p]));

    if (foundProducts.size !== productIds.length) {
      throw badRequest('One or more products are invalid');
    }

    // Enforce B2B/verification rules only when cart contains restricted products
    const requiresB2BProducts = products.filter((product) => product.requiresB2B);
    if (requiresB2BProducts.length > 0) {
      const isB2BUser = req.user.clientType === 'B2B';
      const hasVerificationFile = Boolean(req.user.verificationFileUrl);
      const restrictedProductIds = requiresB2BProducts.map((product) => product._id.toString());

      if (!isB2BUser) {
        throw badRequest(
          'Some products in your cart require a B2B account. Please switch your account to B2B type in your dashboard settings to purchase these products.',
          [{ code: 'b2b_required', productIds: restrictedProductIds }]
        );
      }

      if (!hasVerificationFile) {
        throw badRequest('Verification file is required before placing an order', [
          { code: 'verification_required', productIds: restrictedProductIds },
        ]);
      }
    }

    const comingSoonIssues = [];
    const stockIssues = [];
    for (const [productId, requestedQuantity] of requestedByProductId.entries()) {
      const product = foundProducts.get(productId);
      if (Array.isArray(product.tags) && product.tags.includes(COMING_SOON_TAG)) {
        comingSoonIssues.push({ code: 'coming_soon', productId });
        continue;
      }
      const inventory = product.inventory ?? {};
      const availableQuantity = typeof inventory.quantity === 'number' ? inventory.quantity : 0;

      if (isInventoryOutOfStock(inventory)) {
        stockIssues.push({ code: 'out_of_stock', productId, availableQuantity });
        continue;
      }

      if (!inventory.allowBackorder && availableQuantity < requestedQuantity) {
        stockIssues.push({ code: 'insufficient_stock', productId, availableQuantity, requestedQuantity });
      }
    }

    if (comingSoonIssues.length > 0) {
      throw badRequest('Some products are coming soon and cannot be ordered yet', comingSoonIssues);
    }

    if (stockIssues.length > 0) {
      throw badRequest('Some products are out of stock or have insufficient stock', stockIssues);
    }

    let appliedCoupon = null;
    if (payload.couponCode) {
      const coupon = await Coupon.findOne({ code: payload.couponCode });
      if (!coupon || !coupon.isActive) {
        throw badRequest('Coupon is invalid or inactive');
      }

      const { discountAmount, eligibleSubtotal } = computeCouponDiscount(
        coupon,
        payload.products,
        foundProducts
      );

      appliedCoupon = {
        code: coupon.code,
        type: coupon.type,
        amount: coupon.amount,
        discountAmount,
        eligibleSubtotal,
      };
    }

    // Decrement inventory quantities for in-stock products (best-effort atomicity per product).
    for (const [productId, requestedQuantity] of requestedByProductId.entries()) {
      const product = foundProducts.get(productId);
      if (!product || !product.inventory) {
        continue;
      }

      const allowBackorder = Boolean(product.inventory.allowBackorder);
      if (!allowBackorder) {
        const updated = await Product.findOneAndUpdate(
          {
            _id: product._id,
            'inventory.status': { $ne: 'out_of_stock' },
            'inventory.quantity': { $gte: requestedQuantity },
          },
          { $inc: { 'inventory.quantity': -requestedQuantity } },
          { new: true }
        );

      if (!updated) {
        throw badRequest('Some products are no longer available in the requested quantity', [
          { code: 'insufficient_stock', productId },
        ]);
      }

      normalizeInventoryStatus(updated.inventory);
      sanitizeProductTags(updated);
      updated.markModified('inventory');
      await updated.save();
      continue;
    }

    const currentQuantity = typeof product.inventory.quantity === 'number' ? product.inventory.quantity : 0;
    product.inventory.quantity = Math.max(0, currentQuantity - requestedQuantity);
    normalizeInventoryStatus(product.inventory);
    sanitizeProductTags(product);
    product.markModified('inventory');
    await product.save();
  }

    const orderItems = Array.from(requestedByProductId.entries()).map(([productId, quantity]) => {
      const product = foundProducts.get(productId);
      return {
        productId: product._id,
        name: product.name,
        quantity,
        price: product.price || 0,
        tagsAtPurchase: getOrderItemTags(product),
      };
    });

    const orderSubtotal = orderItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    const orderDiscount = appliedCoupon?.discountAmount ?? 0;
    const discountedSubtotal = Math.max(0, orderSubtotal - orderDiscount);
    let taxRate = 0;
    let taxAmount = 0;
    let taxCountry = null;
    let taxState = null;

    if (req.user.clientType === 'B2B' && !req.user.taxExempt) {
      const location = extractCompanyLocation(req.user.company);
      const match = await findMatchingTaxRate(location);
      if (match) {
        taxRate = typeof match.rate === 'number' ? match.rate : 0;
        taxCountry = match.country || null;
        taxState = match.state || null;
      }
      taxAmount = Math.round(discountedSubtotal * (taxRate / 100) * 100) / 100;
    }

    const order = await Order.create({
      userId: req.user._id,
      products: orderItems,
      status: 'pending',
      ...(appliedCoupon ? { coupon: appliedCoupon } : {}),
      taxRate,
      taxAmount,
      taxCountry,
      taxState,
    });

    req.user.orderHistory.push(order._id);
    req.user.cart = req.user.cart.filter((item) => !productIds.includes(String(item.productId)));
    await req.user.save();

    // Fire-and-forget notifications (do not block order creation on email failures)
    const orderTotal = Math.max(0, orderSubtotal - orderDiscount) + taxAmount;
    const clientEmail = req.user.email;
    const clientName = req.user.name;

    const notifications = [];
    if (clientEmail) {
      notifications.push(
        sendOrderConfirmationEmail({
          to: clientEmail,
          fullName: clientName,
          orderId: order._id.toString(),
          items: orderItems,
          status: 'processing',
          total: orderTotal,
        }).catch((err) => {
          console.error('Failed to send client order confirmation', err);
        })
      );
    }

    notifications.push(
      sendAdminNewOrderEmail({
        clientEmail,
        clientId: req.user._id ? req.user._id.toString() : undefined,
        orderId: order._id.toString(),
        total: orderTotal,
        items: orderItems,
      }).catch((err) => {
        console.error('Failed to send admin new order alert', err);
      })
    );

    await Promise.all(notifications);

    res.status(201).json({ order: order.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = validateUpdateOrder(req.body || {});

    const order = await Order.findById(id).populate({ path: 'userId', select: ORDER_USER_SELECT });
    if (!order) {
      throw notFound('Order not found');
    }

    order.status = payload.status;
    await order.save();

    res.json({ order: order.toJSON() });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
};
