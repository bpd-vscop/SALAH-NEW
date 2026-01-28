const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { validateCreateOrder, validateUpdateOrder } = require('../validators/order');
const { badRequest, notFound, forbidden } = require('../utils/appError');
const { buildOrderDraft, normalizeInventoryStatus, sanitizeProductTags } = require('../utils/orderPricing');
const {
  sendOrderConfirmationEmail,
  sendAdminNewOrderEmail,
  sendShippingConfirmationEmail,
} = require('../services/emailService');
const shipEngine = require('../services/shipEngineService');
const { verifyPaypalPayment, verifyStripePayment } = require('./paymentsController');

const ORDER_USER_SELECT =
  'name email phoneCode phoneNumber clientType status isEmailVerified company billingAddress verificationFileUrl verificationStatus profileImage shippingAddresses accountCreated accountUpdated';


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

    const draft = await buildOrderDraft({ payload, user: req.user });
    const {
      requestedByProductId,
      productIds,
      foundProducts,
      appliedCoupon,
      orderItems,
      orderSubtotal,
      orderDiscount,
      taxRate,
      taxAmount,
      taxCountry,
      taxState,
      shippingMethod,
      shippingCost,
      shippingRateInfo,
      shippingAddressSnapshot,
      orderTotal,
    } = draft;

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

    // ── Payment verification ──────────────────────────────────────
    const paymentMethod = payload.paymentMethod || 'none';
    const paymentId = payload.paymentId || null;
    let paymentStatus = 'pending';
    let paymentDetails = null;

    if (paymentMethod === 'paypal' && paymentId) {
      const result = await verifyPaypalPayment(paymentId);
      if (!result.verified) {
        throw badRequest(`Payment verification failed: ${result.reason}`);
      }
      paymentStatus = 'paid';
    } else if (paymentMethod === 'stripe') {
      if (!paymentId) {
        throw badRequest('Stripe payment requires a payment intent ID');
      }
      const result = await verifyStripePayment(paymentId, orderTotal, 'usd');
      if (!result.verified) {
        throw badRequest(`Payment verification failed: ${result.reason}`);
      }
      paymentStatus = 'paid';
      paymentDetails = result.cardLast4
        ? { brand: result.cardBrand || null, last4: result.cardLast4 }
        : null;
    }

    const initialStatus = paymentStatus === 'paid' ? 'processing' : 'pending';

    const order = await Order.create({
      userId: req.user._id,
      products: orderItems,
      status: initialStatus,
      paymentMethod,
      paymentId,
      paymentStatus,
      ...(paymentDetails ? { paymentDetails } : {}),
      ...(appliedCoupon ? { coupon: appliedCoupon } : {}),
      subtotal: orderSubtotal,
      discountAmount: orderDiscount,
      taxRate,
      taxAmount,
      taxCountry,
      taxState,
      shippingMethod,
      shippingCost,
      shippingAddressSnapshot,
      ...(shippingRateInfo ? { shippingRateInfo } : {}),
      total: orderTotal,
    });

    req.user.orderHistory.push(order._id);
    req.user.cart = req.user.cart.filter((item) => !productIds.includes(String(item.productId)));
    await req.user.save();

    // Fire-and-forget notifications (do not block order creation on email failures)
    const clientEmail = req.user.email;
    const clientName = req.user.name;

    const notifications = [];
    const clientSnapshot = {
      id: req.user._id ? req.user._id.toString() : null,
      name: req.user.name || null,
      email: clientEmail || null,
      phoneCode: req.user.phoneCode || null,
      phoneNumber: req.user.phoneNumber || null,
      clientType: req.user.clientType || null,
      isEmailVerified: typeof req.user.isEmailVerified === 'boolean' ? req.user.isEmailVerified : null,
      company: req.user.company || null,
    };

    if (clientEmail) {
      notifications.push(
        sendOrderConfirmationEmail({
          to: clientEmail,
          fullName: clientName,
          customer: clientSnapshot,
          orderId: order._id.toString(),
          status: order.status,
          items: orderItems,
          subtotal: orderSubtotal,
          discountAmount: orderDiscount,
          couponCode: appliedCoupon?.code || null,
          taxRate,
          taxAmount,
          shippingCost,
          shippingMethod,
          shippingRateInfo,
          shippingAddress: shippingAddressSnapshot,
          paymentMethod,
          paymentDetails,
          total: orderTotal,
          createdAt: order.createdAt,
        }).catch((err) => {
          console.error('Failed to send client order confirmation', err);
        })
      );
    }

    notifications.push(
      sendAdminNewOrderEmail({
        client: clientSnapshot,
        orderId: order._id.toString(),
        items: orderItems,
        subtotal: orderSubtotal,
        discountAmount: orderDiscount,
        couponCode: appliedCoupon?.code || null,
        taxRate,
        taxAmount,
        shippingCost,
        shippingMethod,
        shippingRateInfo,
        shippingAddress: shippingAddressSnapshot,
        paymentMethod,
        paymentDetails,
        total: orderTotal,
        createdAt: order.createdAt,
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

    const previousStatus = order.status;
    order.status = payload.status;

    // Trigger shipment creation when status changes to 'shipped'
    if (payload.status === 'shipped' && previousStatus !== 'shipped' && !order.shipment?.labelId) {
      try {
        const shipEngineConfig = await shipEngine.checkConfigurationFromDb();
        if (shipEngineConfig.isConfigured) {
          // Use shipping address snapshot or fall back to user's default address
          const shipToAddress = order.shippingAddressSnapshot || {
            fullName: order.userId?.name || 'Customer',
            addressLine1: '123 Test St',
            city: 'Austin',
            state: 'TX',
            postalCode: '78701',
            country: 'United States',
          };

          // Calculate total weight from products (estimate 1 lb per item)
          const totalItems = order.products.reduce((sum, item) => sum + item.quantity, 0);
          const estimatedWeight = Math.max(16, totalItems * 8); // 8 oz per item, min 16 oz

          // Map shipping method to service code (will use carrier's default if not matched)
          const serviceCodeMap = {
            standard: 'usps_priority_mail',
            express: 'usps_priority_mail_express',
            overnight: 'usps_priority_mail_express',
          };
          const serviceCode = serviceCodeMap[order.shippingMethod] || 'usps_priority_mail';

          const labelResult = await shipEngine.createLabelFromDb({
            shipTo: shipToAddress,
            serviceCode,
            packages: [{
              weight: estimatedWeight,
              weightUnit: 'ounce',
              dimensions: { length: 12, width: 8, height: 4, unit: 'inch' },
            }],
          });

          order.shipment = {
            labelId: labelResult.labelId,
            shipmentId: labelResult.shipmentId,
            trackingNumber: labelResult.trackingNumber,
            trackingUrl: labelResult.trackingUrl,
            carrierCode: labelResult.carrierCode,
            carrierId: labelResult.carrierId,
            serviceCode: labelResult.serviceCode,
            serviceName: labelResult.serviceName,
            labelUrl: labelResult.labelDownload?.pdf || labelResult.labelDownload?.href,
            shippingCost: labelResult.shippingCost?.amount || 0,
            estimatedDelivery: labelResult.estimatedDelivery ? new Date(labelResult.estimatedDelivery) : null,
            shippedAt: new Date(),
          };
          order.markModified('shipment');

          // Send shipping confirmation email (fire-and-forget)
          const clientEmail = order.userId?.email;
          if (clientEmail && typeof sendShippingConfirmationEmail === 'function') {
            sendShippingConfirmationEmail({
              to: clientEmail,
              fullName: order.userId?.name || 'Customer',
              orderId: order._id.toString(),
              trackingNumber: labelResult.trackingNumber,
              trackingUrl: labelResult.trackingUrl,
              carrierName: labelResult.serviceName || 'Carrier',
              estimatedDelivery: labelResult.estimatedDelivery,
            }).catch((err) => {
              console.error('Failed to send shipping confirmation email', err);
            });
          }
        } else {
          console.warn('ShipEngine not configured - skipping label creation');
        }
      } catch (shipError) {
        console.error('Failed to create shipping label:', shipError.message);
        // Don't fail the status update if label creation fails
      }
    }

    await order.save();

    res.json({ order: order.toJSON() });
  } catch (error) {
    next(error);
  }
};

/**
 * Get tracking information for an order
 */
const getOrderTracking = async (req, res, next) => {
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

    if (!order.shipment?.trackingNumber || !order.shipment?.carrierCode) {
      return res.json({
        hasTracking: false,
        message: 'This order has not been shipped yet',
        shipment: order.shipment || null,
      });
    }

    try {
      const trackingInfo = await shipEngine.getTrackingInfo(
        order.shipment.carrierCode,
        order.shipment.trackingNumber
      );

      res.json({
        hasTracking: true,
        orderId: order._id.toString(),
        shipment: order.shipment,
        tracking: trackingInfo,
      });
    } catch (trackingError) {
      // Return basic shipment info even if tracking fetch fails
      res.json({
        hasTracking: true,
        orderId: order._id.toString(),
        shipment: order.shipment,
        tracking: null,
        trackingError: trackingError.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  getOrderTracking,
};
