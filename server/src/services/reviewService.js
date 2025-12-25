const mongoose = require('mongoose');
const ProductReview = require('../models/ProductReview');
const Product = require('../models/Product');

const recalcProductReviewSummary = async (productId) => {
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return null;
  }

  const id = new mongoose.Types.ObjectId(productId);
  const ratings = await ProductReview.aggregate([
    { $match: { productId: id } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);

  const reviewCount = ratings.reduce((sum, row) => sum + row.count, 0);
  const ratingBreakdown = {};
  const ratingSum = ratings.reduce((sum, row) => {
    ratingBreakdown[String(row._id)] = row.count;
    return sum + row._id * row.count;
  }, 0);

  const averageRating = reviewCount > 0 ? ratingSum / reviewCount : 0;

  const summary = {
    averageRating: Number.isFinite(averageRating) ? Number(averageRating.toFixed(2)) : 0,
    reviewCount,
    ratingBreakdown,
  };

  await Product.updateOne({ _id: id }, { reviewsSummary: summary });

  return summary;
};

module.exports = {
  recalcProductReviewSummary,
};
