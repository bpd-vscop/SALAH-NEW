const Manufacturer = require('../models/Manufacturer');
const { validateCreateManufacturer, validateUpdateManufacturer } = require('../validators/manufacturer');
const { slugify } = require('../utils/slugify');
const { badRequest, notFound } = require('../utils/appError');

const listManufacturers = async (_req, res, next) => {
  try {
    const list = await Manufacturer.find({}).sort({ order: 1, createdAt: -1 });
    res.json({ manufacturers: list.map((m) => m.toJSON()) });
  } catch (err) {
    next(err);
  }
};

const createManufacturer = async (req, res, next) => {
  try {
    const data = validateCreateManufacturer(req.body || {});
    const slug = slugify(data.name);
    const exists = await Manufacturer.findOne({ slug });
    if (exists) {
      throw badRequest('Manufacturer with the same name already exists');
    }
    const created = await Manufacturer.create({
      name: data.name,
      slug,
      logoImage: data.logoImage,
      heroImage: data.heroImage || '',
      order: data.order || 0,
      isActive: data.isActive !== false,
    });
    res.status(201).json({ manufacturer: created.toJSON() });
  } catch (err) {
    next(err);
  }
};

const updateManufacturer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateManufacturer(req.body || {});
    const manufacturer = await Manufacturer.findById(id);
    if (!manufacturer) throw notFound('Manufacturer not found');

    if (data.name && data.name !== manufacturer.name) {
      const nextSlug = slugify(data.name);
      const exists = await Manufacturer.findOne({ slug: nextSlug, _id: { $ne: id } });
      if (exists) throw badRequest('Manufacturer with the same name already exists');
      manufacturer.name = data.name;
      manufacturer.slug = nextSlug;
    }

    if (typeof data.logoImage !== 'undefined') manufacturer.logoImage = data.logoImage;
    if (typeof data.heroImage !== 'undefined') manufacturer.heroImage = data.heroImage;
    if (typeof data.order !== 'undefined') manufacturer.order = data.order;
    if (typeof data.isActive !== 'undefined') manufacturer.isActive = data.isActive;

    await manufacturer.save();
    res.json({ manufacturer: manufacturer.toJSON() });
  } catch (err) {
    next(err);
  }
};

const deleteManufacturer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = await Manufacturer.findByIdAndDelete(id);
    if (!removed) throw notFound('Manufacturer not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listManufacturers,
  createManufacturer,
  updateManufacturer,
  deleteManufacturer,
};

