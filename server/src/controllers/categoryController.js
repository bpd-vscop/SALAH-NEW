const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { validateCreateCategory, validateUpdateCategory } = require('../validators/category');
const { slugify } = require('../utils/slugify');
const { notFound, badRequest } = require('../utils/appError');

const listCategories = async (_req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories: categories.map((c) => c.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const data = validateCreateCategory(req.body || {});
    const slug = slugify(data.name);

    const exists = await Category.findOne({ slug });
    if (exists) {
      throw badRequest('Category with the same name already exists');
    }

    if (data.parentId) {
      const parent = await Category.findById(data.parentId);
      if (!parent) {
        throw badRequest('Parent category not found');
      }
    }

    const category = await Category.create({
      name: data.name,
      parentId: data.parentId || null,
      slug,
      imageUrl: data.imageUrl || null,
      heroImageUrl: data.heroImageUrl || null,
    });

    res.status(201).json({ category: category.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateCategory(req.body || {});

    if (data.parentId && String(data.parentId) === String(id)) {
      throw badRequest('Category cannot reference itself');
    }

    const category = await Category.findById(id);
    if (!category) {
      throw notFound('Category not found');
    }

    if (data.name && data.name !== category.name) {
      const slug = slugify(data.name);
      const exists = await Category.findOne({ slug, _id: { $ne: id } });
      if (exists) {
        throw badRequest('Category with the same name already exists');
      }
      category.name = data.name;
      category.slug = slug;
    }

    if (typeof data.parentId !== 'undefined') {
      if (data.parentId) {
        const parent = await Category.findById(data.parentId);
        if (!parent) {
          throw badRequest('Parent category not found');
        }
        category.parentId = data.parentId;
      } else {
        category.parentId = null;
      }
    }

    if (typeof data.imageUrl !== 'undefined') {
      category.imageUrl = data.imageUrl || null;
    }

    if (typeof data.heroImageUrl !== 'undefined') {
      category.heroImageUrl = data.heroImageUrl || null;
    }

    await category.save();

    res.json({ category: category.toJSON() });
  } catch (error) {
    next(error);
  }
};

const getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    let category = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findById(id);
    }

    if (!category) {
      category = await Category.findOne({ slug: id.toLowerCase() });
    }

    if (!category) {
      throw notFound('Category not found');
    }

    res.json({ category: category.toJSON() });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      throw notFound('Category not found');
    }

    const productCount = await Product.countDocuments({ categoryId: id });
    if (productCount > 0) {
      throw badRequest('Cannot delete category with linked products', [{ count: productCount }]);
    }

    await category.deleteOne();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  getCategory,
  deleteCategory,
};
