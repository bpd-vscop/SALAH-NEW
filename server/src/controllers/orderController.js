const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { validateCreateOrder, validateUpdateOrder } = require('../validators/order');
const { badRequest, notFound, forbidden } = require('../utils/appError');

const listOrders = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'client') {
      filter.userId = req.user._id;
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 });
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

    const order = await Order.findById(id);
    if (!order) {
      throw notFound('Order not found');
    }

    if (req.user.role === 'client' && String(order.userId) !== String(req.user._id)) {
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

    if (!req.user.verificationFileUrl) {
      throw badRequest('Verification file is required before placing an order', [
        { code: 'verification_required' },
      ]);
    }

    const productIds = payload.products.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const foundProducts = new Map(products.map((p) => [p._id.toString(), p]));

    if (foundProducts.size !== productIds.length) {
      throw badRequest('One or more products are invalid');
    }

    const orderItems = payload.products.map((item) => {
      const product = foundProducts.get(item.productId);
      return {
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
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

    res.status(201).json({ order: order.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = validateUpdateOrder(req.body || {});

    const order = await Order.findById(id);
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
