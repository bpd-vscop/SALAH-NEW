const FeaturedShowcase = require('../models/FeaturedShowcase');
const {
  validateCreateFeatured,
  validateUpdateFeatured,
} = require('../validators/featuredShowcase');
const { notFound } = require('../utils/appError');

const MAX_ITEMS_PER_VARIANT = {
  feature: 3,
  tile: 4,
};

const enforceVariantLimit = async (variant) => {
  const items = await FeaturedShowcase.find({ variant }).sort({ updatedAt: -1, createdAt: -1 });
  const limit = MAX_ITEMS_PER_VARIANT[variant] ?? 3;
  if (items.length <= limit) {
    return;
  }

  const excess = items.slice(limit);
  const idsToRemove = excess.map((item) => item._id);
  if (idsToRemove.length) {
    await FeaturedShowcase.deleteMany({ _id: { $in: idsToRemove } });
  }
};

const listFeaturedShowcase = async (_req, res, next) => {
  try {
    const items = await FeaturedShowcase.find().sort({ variant: 1, order: 1, createdAt: -1 });
    res.json({ items: items.map((item) => item.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const createFeaturedShowcase = async (req, res, next) => {
  try {
    const data = validateCreateFeatured(req.body || {});
    const item = await FeaturedShowcase.create(data);
    await enforceVariantLimit(item.variant);
    res.status(201).json({ item: item.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateFeaturedShowcase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateFeatured(req.body || {});
    const item = await FeaturedShowcase.findByIdAndUpdate(id, data, { new: true });
    if (!item) {
      throw notFound('Featured showcase item not found');
    }
    await enforceVariantLimit(item.variant);
    res.json({ item: item.toJSON() });
  } catch (error) {
    next(error);
  }
};

const deleteFeaturedShowcase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await FeaturedShowcase.findByIdAndDelete(id);
    if (!item) {
      throw notFound('Featured showcase item not found');
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listFeaturedShowcase,
  createFeaturedShowcase,
  updateFeaturedShowcase,
  deleteFeaturedShowcase,
};

