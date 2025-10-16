const CategoryDisplayConfig = require('../models/CategoryDisplayConfig');
const Category = require('../models/Category');
const { validateUpdateCategoryDisplay } = require('../validators/categoryDisplay');

const ensureConfig = async () => {
  const existing = await CategoryDisplayConfig.findOne();
  if (existing) {
    return existing;
  }
  return CategoryDisplayConfig.create({ homepageCategories: [], allCategoriesHeroImage: null });
};

const getCategoryDisplay = async (_req, res, next) => {
  try {
    const config = await ensureConfig();
    res.json({ settings: config.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateCategoryDisplay = async (req, res, next) => {
  try {
    const payload = validateUpdateCategoryDisplay(req.body || {});

    if (payload.homepageCategories.length) {
      const count = await Category.countDocuments({ _id: { $in: payload.homepageCategories } });
      if (count !== payload.homepageCategories.length) {
        return res.status(400).json({
          error: {
            message: 'One or more selected categories do not exist',
          },
        });
      }
    }

    const normalizedIds = Array.from(new Set(payload.homepageCategories));

    const config = await ensureConfig();
    config.homepageCategories = normalizedIds;
    config.allCategoriesHeroImage = payload.allCategoriesHeroImage || null;
    await config.save();

    res.json({ settings: config.toJSON() });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategoryDisplay,
  updateCategoryDisplay,
};
