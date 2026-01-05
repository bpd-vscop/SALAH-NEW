const mongoose = require('mongoose');
const ProductReview = require('../models/ProductReview');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { badRequest, notFound, forbidden } = require('../utils/appError');
const { recalcProductReviewSummary } = require('../services/reviewService');

const parseRating = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const rounded = Math.round(parsed * 10) / 10;
  if (rounded < 1 || rounded > 5) {
    return null;
  }
  return rounded;
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const resolveReviewerName = (reqUser, inputName) => {
  if (reqUser?.role === 'client') {
    return reqUser.name || reqUser.email || 'Customer';
  }
  return normalizeText(inputName);
};

const resolveReplyAuthorName = (review, reqUser, authorRole) => {
  if (authorRole === 'admin') {
    return 'ULKSupply Team';
  }
  return reqUser?.name || review.reviewerName || reqUser?.email || 'Customer';
};

const createReview = async (req, res, next) => {
  try {
    const productId = req.params.id || req.body?.productId;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      throw badRequest('Invalid product identifier');
    }

    const rating = parseRating(req.body?.rating);
    if (!rating) {
      throw badRequest('Rating must be between 1 and 5');
    }

    const comment = normalizeText(req.body?.comment);
    if (!comment) {
      throw badRequest('Review comment is required');
    }

    const reviewerName = resolveReviewerName(req.user, req.body?.reviewerName);
    if (!reviewerName) {
      throw badRequest('Reviewer name is required');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw notFound('Product not found');
    }

    let isVerifiedPurchase = false;
    if (req.user?.role === 'client') {
      const match = await Order.exists({
        userId: req.user._id,
        'products.productId': productId,
      });
      isVerifiedPurchase = Boolean(match);
    }

    const review = await ProductReview.create({
      productId,
      userId: req.user?.role === 'client' ? req.user._id : null,
      reviewerName,
      rating,
      comment,
      isVerifiedPurchase,
    });

    const summary = await recalcProductReviewSummary(productId);
    res.status(201).json({ review: review.toJSON(), summary });
  } catch (error) {
    next(error);
  }
};

const listProductReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw notFound('Product not found');
    }
    const reviews = await ProductReview.find({ productId: id }).sort({ createdAt: -1 });
    res.json({ reviews: reviews.map((review) => review.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const listReviews = async (req, res, next) => {
  try {
    const { productId, userId, mine, limit, page } = req.query;
    const filter = {};

    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw badRequest('Invalid product identifier');
      }
      filter.productId = productId;
    }

    if (mine === 'true') {
      if (!req.user) {
        throw forbidden();
      }
      filter.userId = req.user._id;
    } else if (userId) {
      if (!['super_admin', 'admin', 'staff'].includes(req.user.role)) {
        throw forbidden();
      }
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw badRequest('Invalid user identifier');
      }
      filter.userId = userId;
    }

    const parsedLimit = Number.parseInt(limit, 10);
    const parsedPage = Number.parseInt(page, 10);
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20;
    const safePage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    const [reviews, total] = await Promise.all([
      ProductReview.find(filter)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      ProductReview.countDocuments(filter),
    ]);

    res.json({
      reviews: reviews.map((review) => review.toJSON()),
      total,
      page: safePage,
      limit: safeLimit,
    });
  } catch (error) {
    next(error);
  }
};

const addReviewReply = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw notFound('Review not found');
    }

    const review = await ProductReview.findById(id);
    if (!review) {
      throw notFound('Review not found');
    }

    const message = normalizeText(req.body?.message);
    if (!message) {
      throw badRequest('Reply message is required');
    }

    const role = req.user?.role;
    const isAdmin = ['super_admin', 'admin', 'staff'].includes(role);
    const isClient = role === 'client';
    if (!isAdmin && !isClient) {
      throw forbidden();
    }

    if (isClient) {
      if (!review.userId || review.userId.toString() !== req.user._id.toString()) {
        throw forbidden();
      }
    }

    const authorRole = isAdmin ? 'admin' : 'client';
    const authorName = resolveReplyAuthorName(review, req.user, authorRole);
    review.replies.push({
      authorRole,
      authorId: req.user?._id ?? null,
      authorName: authorName || null,
      message,
    });

    await review.save();
    res.status(201).json({ review: review.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw notFound('Review not found');
    }

    const review = await ProductReview.findById(id);
    if (!review) {
      throw notFound('Review not found');
    }

    if (typeof req.body?.adminComment === 'string') {
      const comment = normalizeText(req.body.adminComment);
      review.adminComment = comment || null;
    }

    if (typeof req.body?.comment === 'string') {
      const nextComment = normalizeText(req.body.comment);
      if (nextComment) {
        review.comment = nextComment;
      }
    }

    if (typeof req.body?.rating !== 'undefined') {
      const nextRating = parseRating(req.body.rating);
      if (!nextRating) {
        throw badRequest('Rating must be between 1 and 5');
      }
      review.rating = nextRating;
    }

    await review.save();
    const summary = await recalcProductReviewSummary(review.productId.toString());
    res.json({ review: review.toJSON(), summary });
  } catch (error) {
    next(error);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw notFound('Review not found');
    }

    const review = await ProductReview.findById(id);
    if (!review) {
      throw notFound('Review not found');
    }

    await ProductReview.deleteOne({ _id: id });
    await recalcProductReviewSummary(review.productId.toString());
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const bulkDeleteReviews = async (req, res, next) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      throw badRequest('Review ids must be an array');
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (!validIds.length) {
      throw badRequest('No valid review ids provided');
    }

    const reviews = await ProductReview.find({ _id: { $in: validIds } }, { productId: 1 });
    const productIds = new Set(reviews.map((review) => review.productId.toString()));

    await ProductReview.deleteMany({ _id: { $in: validIds } });
    await Promise.all(Array.from(productIds).map((productId) => recalcProductReviewSummary(productId)));

    res.json({ deleted: validIds.length });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  listProductReviews,
  listReviews,
  addReviewReply,
  updateReview,
  deleteReview,
  bulkDeleteReviews,
};
