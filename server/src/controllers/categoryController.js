const Category = require('../models/Category');
const Product = require('../models/Product');
const { validateCategory } = require('../validators/category');
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
    const data = validateCategory(req.body || {});
    const slug = slugify(data.name);

    const exists = await Category.findOne({ slug });
    if (exists) {
      throw badRequest('Category with the same name already exists');
    }

    const category = await Category.create({
      name: data.name,
      parentId: data.parentId || null,
      slug,
    });

    res.status(201).json({ category: category.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateCategory(req.body || {});

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

    category.parentId = data.parentId || null;
    await category.save();

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
  deleteCategory,
};
