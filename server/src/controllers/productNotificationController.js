const Product = require('../models/Product');
const ProductRestockSubscription = require('../models/ProductRestockSubscription');
const { sendRestockSubscriptionEmail } = require('../services/emailService');
const { badRequest, notFound } = require('../utils/appError');

const COMING_SOON_TAG = 'coming soon';

const requestRestockNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user || user.role !== 'client') {
      throw badRequest('Only client accounts can request notifications.');
    }

    const product = await Product.findById(id);
    if (!product) {
      throw notFound('Product not found');
    }

    const isComingSoon = Array.isArray(product.tags) && product.tags.includes(COMING_SOON_TAG);
    if (!isComingSoon) {
      throw badRequest('Notifications are only available for coming soon products.');
    }

    if (!user.email) {
      throw badRequest('A valid email address is required to receive notifications.');
    }

    const existing = await ProductRestockSubscription.findOne({
      userId: user._id,
      productId: product._id,
    });

    let alreadySubscribed = false;
    let shouldSendConfirmation = true;

    if (existing) {
      if (existing.notifiedAt) {
        existing.notifiedAt = null;
        await existing.save();
      } else {
        alreadySubscribed = true;
        shouldSendConfirmation = false;
      }
    } else {
      await ProductRestockSubscription.create({
        userId: user._id,
        productId: product._id,
      });
    }

    let emailSent = false;
    if (shouldSendConfirmation) {
      try {
        await sendRestockSubscriptionEmail({
          to: user.email,
          fullName: user.name,
          productName: product.name,
          productId: product._id.toString(),
        });
        emailSent = true;
      } catch (error) {
        console.error('Failed to send restock subscription email', error);
      }
    }

    res.json({ subscribed: true, alreadySubscribed, emailSent });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestRestockNotification,
};
