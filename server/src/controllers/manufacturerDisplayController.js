const ManufacturerDisplayConfig = require('../models/ManufacturerDisplayConfig');
const Manufacturer = require('../models/Manufacturer');
const { validateUpdateManufacturerDisplay } = require('../validators/manufacturerDisplay');
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
const MANUFACTURER_DISPLAY_TEMP_DIR = path.posix.join('_tmp', 'manufacturer-display');

const ensureConfig = async () => {
  const existing = await ManufacturerDisplayConfig.findOne();
  if (existing) return existing;
  return ManufacturerDisplayConfig.create({ homepageManufacturers: [], allManufacturersHeroImage: null });
};

const getManufacturerDisplay = async (_req, res, next) => {
  try {
    const config = await ensureConfig();
    res.json({ settings: config.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateManufacturerDisplay = async (req, res, next) => {
  try {
    const payload = validateUpdateManufacturerDisplay(req.body || {});

    if (payload.homepageManufacturers.length) {
      const count = await Manufacturer.countDocuments({ _id: { $in: payload.homepageManufacturers } });
      if (count !== payload.homepageManufacturers.length) {
        return res.status(400).json({
          error: { message: 'One or more selected manufacturers do not exist' },
        });
      }
    }

    const normalizedIds = Array.from(new Set(payload.homepageManufacturers));

    const config = await ensureConfig();
    config.homepageManufacturers = normalizedIds;

    if ('allManufacturersHeroImage' in payload) {
      const requested = payload.allManufacturersHeroImage;
      if (!requested) {
        if (config.allManufacturersHeroImage && normalizePosixPath(config.allManufacturersHeroImage).startsWith('/uploads/')) {
          await safeUnlinkUploadsUrlPath(config.allManufacturersHeroImage);
        }
        config.allManufacturersHeroImage = null;
      } else if (requested.startsWith('/uploads/_tmp/')) {
        const configId = String(config._id);
        config.allManufacturersHeroImage = await moveUploadsUrlPath(requested, {
          relativeDir: path.posix.join('home', 'manufacturer-display', configId, 'images'),
          filename: 'hero.webp',
        });
      } else {
        config.allManufacturersHeroImage = requested;
      }
    }

    await config.save();

    res.json({ settings: config.toJSON() });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getManufacturerDisplay,
  updateManufacturerDisplay,
  uploadManufacturerDisplayHeroImage: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        throw badRequest('No hero image provided');
      }

      const filename = `manufacturer-display-hero-${Date.now()}-${randomUUID()}.webp`;
      const relativePath = await saveWebpImage(req.file.buffer, {
        relativeDir: MANUFACTURER_DISPLAY_TEMP_DIR,
        filename,
        maxBytes: MAX_MARKETING_IMAGE_BYTES,
      });

      res.status(201).json({ data: { path: relativePath } });
    } catch (error) {
      next(error);
    }
  },
};
