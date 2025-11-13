const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { validateCreateProduct, validateUpdateProduct } = require('../validators/product');
const { notFound, badRequest } = require('../utils/appError');
const { saveProductImage, ImageOptimizationError } = require('../services/productImageService');

const sanitizeVariations = (variations) =>
  Array.isArray(variations)
    ? variations.map(({ id, _id, ...rest }) => {
        if (_id) {
          return { ...rest, _id };
        }
        return rest;
      })
    : variations;

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

    const payload = {
      ...data,
      tags: data.tags && data.tags.length ? data.tags : undefined,
      manufacturerId: data.manufacturerId || null,
      saleStartDate: data.saleStartDate ?? undefined,
      saleEndDate: data.saleEndDate ?? undefined,
    };

    if (typeof data.saleStartDate === 'string' && !data.saleStartDate) {
      payload.saleStartDate = undefined;
    }
    if (typeof data.saleEndDate === 'string' && !data.saleEndDate) {
      payload.saleEndDate = undefined;
    }

    if (typeof data.manufacturerName === 'string' && !data.manufacturerName.trim()) {
      payload.manufacturerName = undefined;
    }

    if (data.variations) {
      payload.variations = sanitizeVariations(data.variations);
    }

    const product = await Product.create(payload);

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

    const assignFields = [
      'name',
      'slug',
      'sku',
      'productCode',
      'productType',
      'status',
      'visibility',
      'manufacturerName',
      'tags',
      'shortDescription',
      'description',
      'featureHighlights',
      'images',
      'videoUrls',
      'price',
      'salePrice',
      'saleStartDate',
      'saleEndDate',
      'taxClass',
      'packageContents',
      'specifications',
      'attributes',
      'customAttributes',
      'variationAttributes',
      'documents',
      'compatibility',
      'relatedProductIds',
      'upsellProductIds',
      'crossSellProductIds',
      'seo',
      'badges',
      'support',
      'reviewsSummary',
      'notes',
    ];

    assignFields.forEach((field) => {
      if (typeof data[field] !== 'undefined') {
        if ((field === 'saleStartDate' || field === 'saleEndDate') && data[field] === null) {
          product[field] = undefined;
        } else {
          product[field] = data[field];
        }
      }
    });

    if (typeof data.manufacturerId !== 'undefined') {
      product.manufacturerId = data.manufacturerId || null;
    }

    if (typeof data.inventory !== 'undefined') {
      product.inventory = data.inventory;
    }

    if (typeof data.shipping !== 'undefined') {
      product.shipping = data.shipping;
    }

    if (typeof data.variations !== 'undefined') {
      product.variations = sanitizeVariations(data.variations);
    }

    if (product.manufacturerName && !product.manufacturerName.trim()) {
      product.manufacturerName = undefined;
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

const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      throw badRequest('No product image provided');
    }

    const relativePath = await saveProductImage(req.file.buffer);

    res.status(201).json({ data: { path: relativePath } });
  } catch (error) {
    if (error instanceof ImageOptimizationError) {
      next(badRequest(error.message));
      return;
    }
    next(error);
  }
};

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
};
