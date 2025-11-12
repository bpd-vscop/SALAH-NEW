const Brand = require('../models/Brand');
const { validateCreateBrand, validateUpdateBrand } = require('../validators/brand');
const { slugify } = require('../utils/slugify');
const { badRequest, notFound } = require('../utils/appError');

const listBrands = async (_req, res, next) => {
  try {
    const list = await Brand.find({}).sort({ order: 1, createdAt: -1 });
    res.json({ brands: list.map((b) => b.toJSON()) });
  } catch (err) {
    next(err);
  }
};

const createBrand = async (req, res, next) => {
  try {
    const data = validateCreateBrand(req.body || {});
    const slug = slugify(data.name);
    const exists = await Brand.findOne({ slug });
    if (exists) {
      throw badRequest('Brand with the same name already exists');
    }
    const created = await Brand.create({
      name: data.name,
      slug,
      logoImage: data.logoImage,
      order: data.order || 0,
      isActive: data.isActive !== false,
    });
    res.status(201).json({ brand: created.toJSON() });
  } catch (err) {
    next(err);
  }
};

const updateBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateBrand(req.body || {});
    const brand = await Brand.findById(id);
    if (!brand) throw notFound('Brand not found');

    if (data.name && data.name !== brand.name) {
      const nextSlug = slugify(data.name);
      const exists = await Brand.findOne({ slug: nextSlug, _id: { $ne: id } });
      if (exists) throw badRequest('Brand with the same name already exists');
      brand.name = data.name;
      brand.slug = nextSlug;
    }

    if (typeof data.logoImage !== 'undefined') brand.logoImage = data.logoImage;
    if (typeof data.order !== 'undefined') brand.order = data.order;
    if (typeof data.isActive !== 'undefined') brand.isActive = data.isActive;

    await brand.save();
    res.json({ brand: brand.toJSON() });
  } catch (err) {
    next(err);
  }
};

const deleteBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = await Brand.findByIdAndDelete(id);
    if (!removed) throw notFound('Brand not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
};
