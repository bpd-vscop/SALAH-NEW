const HeroSlide = require('../models/HeroSlide');
const {
  validateCreateHeroSlide,
  validateUpdateHeroSlide,
} = require('../validators/heroSlide');
const { notFound } = require('../utils/appError');

const MAX_SLIDES = 3;

const enforceSlideLimit = async () => {
  const slides = await HeroSlide.find().sort({ updatedAt: -1, createdAt: -1 });
  if (slides.length <= MAX_SLIDES) {
    return;
  }

  const excess = slides.slice(MAX_SLIDES);
  const idsToRemove = excess.map((slide) => slide._id);
  if (idsToRemove.length) {
    await HeroSlide.deleteMany({ _id: { $in: idsToRemove } });
  }
};

const listHeroSlides = async (_req, res, next) => {
  try {
    const slides = await HeroSlide.find().sort({ order: 1, createdAt: -1 });
    res.json({ slides: slides.map((slide) => slide.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const createHeroSlide = async (req, res, next) => {
  try {
    const data = validateCreateHeroSlide(req.body || {});
    const slide = await HeroSlide.create(data);
    await enforceSlideLimit();
    res.status(201).json({ slide: slide.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateHeroSlide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateHeroSlide(req.body || {});
    const slide = await HeroSlide.findByIdAndUpdate(id, data, { new: true });
    if (!slide) {
      throw notFound('Hero slide not found');
    }
    res.json({ slide: slide.toJSON() });
  } catch (error) {
    next(error);
  }
};

const deleteHeroSlide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const slide = await HeroSlide.findByIdAndDelete(id);
    if (!slide) {
      throw notFound('Hero slide not found');
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
};

