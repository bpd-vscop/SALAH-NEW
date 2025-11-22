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

const sanitizeSerialNumbers = (serialNumbers) =>
  Array.isArray(serialNumbers)
    ? serialNumbers.map(({ id, _id, ...rest }) => {
        if (_id) {
          return { ...rest, _id };
        }
        return rest;
      })
    : serialNumbers;

// Remove sensitive admin-only data from public API responses
const sanitizeProductForPublic = (product) => {
  const productData = product.toJSON();
  // Remove serial numbers - this is admin-only inventory tracking data
  delete productData.serialNumbers;
  // Remove internal pricing data
  delete productData.cost;
  // Remove internal notes
  if (productData.notes) {
    delete productData.notes.internal;
  }
  return productData;
};

const listProducts = async (req, res, next) => {
  try {
    const { categoryId, manufacturerId, manufacturerIds, tags, search, includeSerials, vehicleYear, vehicleMake, vehicleModel, minPrice, maxPrice } = req.query;
    const filter = {};
    const shouldIncludeSerials = String(includeSerials || '').toLowerCase() === 'true';

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.categoryId = categoryId;
    }

    // Handle single manufacturer (backwards compatibility)
    if (manufacturerId && mongoose.Types.ObjectId.isValid(manufacturerId)) {
      filter.manufacturerId = manufacturerId;
    }

    // Handle multiple manufacturers
    if (manufacturerIds) {
      const idList = Array.isArray(manufacturerIds) ? manufacturerIds : String(manufacturerIds).split(',');
      const validIds = idList.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length > 0) {
        filter.manufacturerId = { $in: validIds };
      }
    }

    if (tags) {
      const tagList = Array.isArray(tags) ? tags : String(tags).split(',');
      filter.tags = { $in: tagList };
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    // Price filtering
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) {
        const min = parseFloat(minPrice);
        if (!isNaN(min)) {
          filter.price.$gte = min;
        }
      }
      if (maxPrice) {
        const max = parseFloat(maxPrice);
        if (!isNaN(max)) {
          filter.price.$lte = max;
        }
      }
    }

    // Vehicle compatibility filtering
    if (vehicleMake || vehicleModel || vehicleYear) {
      const compatibilityFilter = {};

      if (vehicleMake) {
        compatibilityFilter['compatibility.make'] = { $regex: new RegExp(`^${vehicleMake}$`, 'i') };
      }

      if (vehicleModel) {
        compatibilityFilter['compatibility.model'] = { $regex: new RegExp(`^${vehicleModel}$`, 'i') };
      }

      if (vehicleYear) {
        const year = parseInt(vehicleYear, 10);
        if (!isNaN(year)) {
          // Match products where:
          // 1. Specific year matches, OR
          // 2. Year falls within yearStart and yearEnd range, OR
          // 3. Year is >= yearStart (if no yearEnd), OR
          // 4. Year is <= yearEnd (if no yearStart)
          compatibilityFilter.$or = [
            { 'compatibility.year': year },
            {
              'compatibility.yearStart': { $lte: year },
              'compatibility.yearEnd': { $gte: year }
            },
            {
              'compatibility.yearStart': { $lte: year },
              'compatibility.yearEnd': { $exists: false }
            },
            {
              'compatibility.yearStart': { $exists: false },
              'compatibility.yearEnd': { $gte: year }
            }
          ];
        }
      }

      // Merge compatibility filter into main filter
      Object.assign(filter, compatibilityFilter);
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({
      products: products.map((p) => (shouldIncludeSerials ? p.toJSON() : sanitizeProductForPublic(p))),
    });
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
    res.json({ product: sanitizeProductForPublic(product) });
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

    if (typeof data.cost !== 'undefined') {
      payload.cost = data.cost === null ? undefined : data.cost;
    }

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

    if (data.serialNumbers) {
      payload.serialNumbers = sanitizeSerialNumbers(data.serialNumbers);
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

    if (typeof data.cost !== 'undefined') {
      product.cost = data.cost === null ? undefined : data.cost;
    }

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

    if (typeof data.serialNumbers !== 'undefined') {
      product.serialNumbers = sanitizeSerialNumbers(data.serialNumbers);
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

const getVehicleCompatibilityOptions = async (req, res, next) => {
  try {
    const { make, model } = req.query;

    // Build filter based on selected make/model
    const filter = { 'compatibility.0': { $exists: true } };

    const products = await Product.find(filter, { compatibility: 1 });

    const makes = new Set();
    const models = new Set();
    const years = new Set();

    products.forEach((product) => {
      if (product.compatibility && Array.isArray(product.compatibility)) {
        product.compatibility.forEach((compat) => {
          // Apply filters to determine what to include
          const makeMatches = !make || (compat.make && compat.make.toLowerCase() === make.toLowerCase());
          const modelMatches = !model || (compat.model && compat.model.toLowerCase() === model.toLowerCase());

          // Always collect all makes
          if (compat.make) {
            makes.add(compat.make);
          }

          // Only collect models for the selected make (or all if no make selected)
          if (makeMatches && compat.model) {
            models.add(compat.model);
          }

          // Only collect years for the selected make+model (or all if none selected)
          if (makeMatches && modelMatches) {
            if (compat.year) years.add(compat.year);
            if (compat.yearStart && compat.yearEnd) {
              for (let y = compat.yearStart; y <= compat.yearEnd; y++) {
                years.add(y);
              }
            } else if (compat.yearStart) {
              years.add(compat.yearStart);
            } else if (compat.yearEnd) {
              years.add(compat.yearEnd);
            }
          }
        });
      }
    });

    res.json({
      makes: Array.from(makes).sort(),
      models: Array.from(models).sort(),
      years: Array.from(years).sort((a, b) => b - a), // Descending order (newest first)
    });
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
  uploadProductImage,
  getVehicleCompatibilityOptions,
};
