const CategoryDisplayConfig = require('../models/CategoryDisplayConfig');
const Category = require('../models/Category');
const { validateUpdateCategoryDisplay } = require('../validators/categoryDisplay');
const path = require('path');
const { randomUUID } = require('crypto');
const { badRequest } = require('../utils/appError');
const {
  saveWebpImage,
  moveUploadsUrlPath,
  normalizePosixPath,
  safeUnlinkUploadsUrlPath,
} = require('../services/mediaStorageService');

const MAX_MARKETING_IMAGE_BYTES = 2 * 1024 * 1024;
const CATEGORY_DISPLAY_TEMP_DIR = path.posix.join('_tmp', 'category-display');

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

    if ('allCategoriesHeroImage' in payload) {
      const requested = payload.allCategoriesHeroImage;
      if (!requested) {
        if (config.allCategoriesHeroImage && normalizePosixPath(config.allCategoriesHeroImage).startsWith('/uploads/')) {
          await safeUnlinkUploadsUrlPath(config.allCategoriesHeroImage);
        }
        config.allCategoriesHeroImage = null;
      } else if (requested.startsWith('/uploads/_tmp/')) {
        const configId = String(config._id);
        config.allCategoriesHeroImage = await moveUploadsUrlPath(requested, {
          relativeDir: path.posix.join('home', 'category-display', configId, 'images'),
          filename: 'hero.webp',
        });
      } else {
        config.allCategoriesHeroImage = requested;
      }
    }

    await config.save();

    res.json({ settings: config.toJSON() });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategoryDisplay,
  updateCategoryDisplay,
  uploadCategoryDisplayHeroImage: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        throw badRequest('No hero image provided');
      }

      const filename = `category-display-hero-${Date.now()}-${randomUUID()}.webp`;
      const relativePath = await saveWebpImage(req.file.buffer, {
        relativeDir: CATEGORY_DISPLAY_TEMP_DIR,
        filename,
        maxBytes: MAX_MARKETING_IMAGE_BYTES,
      });

      res.status(201).json({ data: { path: relativePath } });
    } catch (error) {
      next(error);
    }
  },
};
