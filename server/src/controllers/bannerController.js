const Banner = require('../models/Banner');
const { validateBanner } = require('../validators/banner');
const { notFound } = require('../utils/appError');

const listBanners = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type) {
      filter.type = type;
    }
    const banners = await Banner.find(filter).sort({ order: 1, createdAt: -1 });
    res.json({ banners: banners.map((b) => b.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const createBanner = async (req, res, next) => {
  try {
    const data = validateBanner(req.body || {});
    const banner = await Banner.create(data);
    res.status(201).json({ banner: banner.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateBanner(req.body || {});
    const banner = await Banner.findByIdAndUpdate(id, data, { new: true });
    if (!banner) {
      throw notFound('Banner not found');
    }
    res.json({ banner: banner.toJSON() });
  } catch (error) {
    next(error);
  }
};

const deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      throw notFound('Banner not found');
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};
