const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { validateCreateProduct, validateUpdateProduct } = require('../validators/product');
const { notFound, badRequest } = require('../utils/appError');

const listProducts = async (req, res, next) => {
  try {
    const { categoryId, tags, search } = req.query;
    const filter = {};

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.categoryId = categoryId;
    }

    if (tags) {
      const tagList = Array.isArray(tags) ? tags : String(tags).split(',');
      filter.tags = { $in: tagList };
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ products: products.map((p) => p.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      throw notFound('Product not found');
    }
    res.json({ product: product.toJSON() });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const data = validateCreateProduct(req.body || {});

    const category = await Category.findById(data.categoryId);
    if (!category) {
      throw badRequest('Category does not exist');
    }

    const product = await Product.create({
      ...data,
      tags: data.tags && data.tags.length ? data.tags : undefined,
    });

    res.status(201).json({ product: product.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateProduct(req.body || {});

    const product = await Product.findById(id);
    if (!product) {
      throw notFound('Product not found');
    }

    if (data.categoryId && data.categoryId !== String(product.categoryId)) {
      const category = await Category.findById(data.categoryId);
      if (!category) {
        throw badRequest('Category does not exist');
      }
      product.categoryId = data.categoryId;
    }

    if (typeof data.name !== 'undefined') {
      product.name = data.name;
    }

    if (typeof data.tags !== 'undefined') {
      product.tags = data.tags;
    }

    if (typeof data.description !== 'undefined') {
      product.description = data.description;
    }

    if (typeof data.images !== 'undefined') {
      product.images = data.images;
    }

    if (typeof data.price !== 'undefined') {
      product.price = data.price;
    }

    if (typeof data.attributes !== 'undefined') {
      product.attributes = data.attributes;
    }

    await product.save();

    res.json({ product: product.toJSON() });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      throw notFound('Product not found');
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
