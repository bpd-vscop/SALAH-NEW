const Model = require('../models/Model');
const { validateCreateModel, validateUpdateModel } = require('../validators/model');
const { slugify } = require('../utils/slugify');
const { badRequest, notFound } = require('../utils/appError');

const listModels = async (_req, res, next) => {
  try {
    const list = await Model.find({}).sort({ order: 1, createdAt: -1 });
    res.json({ models: list.map((m) => m.toJSON()) });
  } catch (err) {
    next(err);
  }
};

const createModel = async (req, res, next) => {
  try {
    const data = validateCreateModel(req.body || {});
    const slug = slugify(data.name);
    const exists = await Model.findOne({ slug });
    if (exists) {
      throw badRequest('Model with the same name already exists');
    }
    const created = await Model.create({
      name: data.name,
      slug,
      brandId: data.brandId || null,
      order: data.order || 0,
      isActive: data.isActive !== false,
    });
    res.status(201).json({ model: created.toJSON() });
  } catch (err) {
    next(err);
  }
};

const updateModel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateModel(req.body || {});
    const model = await Model.findById(id);
    if (!model) throw notFound('Model not found');

    if (data.name && data.name !== model.name) {
      const nextSlug = slugify(data.name);
      const exists = await Model.findOne({ slug: nextSlug, _id: { $ne: id } });
      if (exists) throw badRequest('Model with the same name already exists');
      model.name = data.name;
      model.slug = nextSlug;
    }

    if (typeof data.brandId !== 'undefined') model.brandId = data.brandId || null;
    if (typeof data.order !== 'undefined') model.order = data.order;
    if (typeof data.isActive !== 'undefined') model.isActive = data.isActive;

    await model.save();
    res.json({ model: model.toJSON() });
  } catch (err) {
    next(err);
  }
};

const deleteModel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = await Model.findByIdAndDelete(id);
    if (!removed) throw notFound('Model not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listModels,
  createModel,
  updateModel,
  deleteModel,
};
