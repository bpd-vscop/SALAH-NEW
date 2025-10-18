const ManufacturerDisplayConfig = require('../models/ManufacturerDisplayConfig');
const Manufacturer = require('../models/Manufacturer');
const { validateUpdateManufacturerDisplay } = require('../validators/manufacturerDisplay');

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
    config.allManufacturersHeroImage = payload.allManufacturersHeroImage || null;
    await config.save();

    res.json({ settings: config.toJSON() });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getManufacturerDisplay,
  updateManufacturerDisplay,
};

