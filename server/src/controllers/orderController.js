const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { validateCreateOrder, validateUpdateOrder } = require('../validators/order');
const { badRequest, notFound, forbidden } = require('../utils/appError');
const {
  sendOrderConfirmationEmail,
  sendAdminNewOrderEmail,
} = require('../services/emailService');

const ORDER_USER_SELECT =
  'name email phoneCode phoneNumber clientType status isEmailVerified company verificationFileUrl profileImage shippingAddresses accountCreated accountUpdated';

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

    const stockIssues = [];
    for (const [productId, requestedQuantity] of requestedByProductId.entries()) {
      const product = foundProducts.get(productId);
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

    if (stockIssues.length > 0) {
      throw badRequest('Some products are out of stock or have insufficient stock', stockIssues);
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
        updated.markModified('inventory');
        await updated.save();
        continue;
      }

      const currentQuantity = typeof product.inventory.quantity === 'number' ? product.inventory.quantity : 0;
      product.inventory.quantity = Math.max(0, currentQuantity - requestedQuantity);
      normalizeInventoryStatus(product.inventory);
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
        tagsAtPurchase: product.tags,
      };
    });

    const order = await Order.create({
      userId: req.user._id,
      products: orderItems,
      status: 'pending',
    });

    req.user.orderHistory.push(order._id);
    req.user.cart = req.user.cart.filter((item) => !productIds.includes(String(item.productId)));
    await req.user.save();

    // Fire-and-forget notifications (do not block order creation on email failures)
    const orderTotal = orderItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
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
