const Tag = require('../models/Tag');
const { validateCreateTag, validateUpdateTag } = require('../validators/tag');
const { slugify } = require('../utils/slugify');
const { badRequest, notFound } = require('../utils/appError');

const listTags = async (_req, res, next) => {
  try {
    const list = await Tag.find({}).sort({ order: 1, createdAt: -1 });
    res.json({ tags: list.map((t) => t.toJSON()) });
  } catch (err) {
    next(err);
  }
};

const createTag = async (req, res, next) => {
  try {
    const data = validateCreateTag(req.body || {});
    const slug = slugify(data.name);
    const exists = await Tag.findOne({ slug });
    if (exists) {
      throw badRequest('Tag with the same name already exists');
    }
    const created = await Tag.create({
      name: data.name,
      slug,
      order: data.order || 0,
      isActive: data.isActive !== false,
    });
    res.status(201).json({ tag: created.toJSON() });
  } catch (err) {
    next(err);
  }
};

const updateTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateTag(req.body || {});
    const tag = await Tag.findById(id);
    if (!tag) throw notFound('Tag not found');

    if (data.name && data.name !== tag.name) {
      const nextSlug = slugify(data.name);
      const exists = await Tag.findOne({ slug: nextSlug, _id: { $ne: id } });
      if (exists) throw badRequest('Tag with the same name already exists');
      tag.name = data.name;
      tag.slug = nextSlug;
    }

    if (typeof data.order !== 'undefined') tag.order = data.order;
    if (typeof data.isActive !== 'undefined') tag.isActive = data.isActive;

    await tag.save();
    res.json({ tag: tag.toJSON() });
  } catch (err) {
    next(err);
  }
};

const deleteTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = await Tag.findByIdAndDelete(id);
    if (!removed) throw notFound('Tag not found');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listTags,
  createTag,
  updateTag,
  deleteTag,
};
