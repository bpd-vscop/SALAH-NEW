const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Manufacturer = require('../models/Manufacturer');
const { validateCreateProduct, validateUpdateProduct } = require('../validators/product');
const { notFound, badRequest } = require('../utils/appError');
const { saveProductImage, ImageOptimizationError } = require('../services/productImageService');
const path = require('path');
const fs = require('fs');
const {
  uploadsRoot,
  buildEntityFolderName,
  normalizePosixPath,
  moveUploadsUrlPath,
  pathExists,
  safeUnlinkUploadsUrlPath,
  safeRemoveUploadsDir,
} = require('../services/mediaStorageService');

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

const normalizeCategoryIds = (primaryId, categoryIds) => {
  const normalized = [];
  const seen = new Set();
  const add = (value) => {
    if (!value) return;
    const stringValue = String(value);
    if (seen.has(stringValue)) return;
    seen.add(stringValue);
    normalized.push(stringValue);
  };
  add(primaryId);
  if (Array.isArray(categoryIds)) {
    categoryIds.forEach(add);
  }
  return normalized;
};

const COMING_SOON_TAG = 'coming soon';
const NEW_ARRIVAL_DAYS = 30;

const sanitizeTags = (tags) => {
  if (!Array.isArray(tags)) {
    return [];
  }
  const filtered = tags.filter((tag) => tag === COMING_SOON_TAG);
  return Array.from(new Set(filtered));
};

const PRODUCT_UPLOADS_PREFIX = '/uploads/products/';
const PRODUCT_TMP_IMAGES_PREFIX = '/uploads/products/_tmp/images/';
const PRODUCT_TMP_DOCUMENTS_PREFIX = '/uploads/products/_tmp/documents/';

const renameUploadsDirIfExists = async (fromRelativeDir, toRelativeDir) => {
  const fromAbs = path.resolve(uploadsRoot, ...normalizePosixPath(fromRelativeDir).split('/'));
  const toAbs = path.resolve(uploadsRoot, ...normalizePosixPath(toRelativeDir).split('/'));

  if (!(await pathExists(fromAbs))) {
    return;
  }

  await fs.promises.mkdir(path.dirname(toAbs), { recursive: true });
  if (await pathExists(toAbs)) {
    return;
  }

  await fs.promises.rename(fromAbs, toAbs);
};

const isLegacyProductRootFile = (uploadsUrlPath) => {
  const normalized = normalizePosixPath(uploadsUrlPath);
  if (!normalized.startsWith(PRODUCT_UPLOADS_PREFIX)) {
    return false;
  }
  if (normalized.startsWith('/uploads/products/_tmp/')) {
    return false;
  }
  const remainder = normalized.slice(PRODUCT_UPLOADS_PREFIX.length);
  return remainder.length > 0 && !remainder.includes('/');
};

const collectProductUploadPaths = (product) => {
  const collected = new Set();
  const add = (value) => {
    if (typeof value !== 'string') return;
    const normalized = normalizePosixPath(value);
    if (normalized.startsWith('/uploads/')) {
      collected.add(normalized);
    }
  };

  (product.images || []).forEach(add);
  (product.documents || []).forEach((doc) => add(doc && doc.url));
  (product.variations || []).forEach((variation) => add(variation && variation.image));

  if (product.seo && product.seo.openGraphImage) {
    add(product.seo.openGraphImage);
  }

  return collected;
};

const relocateProductUploadPaths = async (product, { previousName } = {}) => {
  const beforeFolderName = buildEntityFolderName(previousName || product.name, product._id);
  const folderName = buildEntityFolderName(product.name, product._id);

  if (beforeFolderName !== folderName) {
    await renameUploadsDirIfExists(
      path.posix.join('products', beforeFolderName),
      path.posix.join('products', folderName)
    );

    const oldPrefix = `/uploads/products/${beforeFolderName}/`;
    const newPrefix = `/uploads/products/${folderName}/`;
    const rewrite = (value) => {
      if (typeof value !== 'string') return value;
      const normalized = normalizePosixPath(value);
      if (normalized.startsWith(oldPrefix)) {
        return normalized.replace(oldPrefix, newPrefix);
      }
      return value;
    };

    product.images = (product.images || []).map(rewrite);
    product.documents = (product.documents || []).map((doc) =>
      doc && doc.url ? { ...doc, url: rewrite(doc.url) } : doc
    );
    product.variations = (product.variations || []).map((variation) => {
      if (!variation || typeof variation.image !== 'string') {
        return variation;
      }
      const nextImage = rewrite(variation.image);
      if (typeof variation.toObject === 'function') {
        const plain = variation.toObject();
        plain.image = nextImage;
        return plain;
      }
      return { ...variation, image: nextImage };
    });
    if (product.seo && product.seo.openGraphImage) {
      product.seo.openGraphImage = rewrite(product.seo.openGraphImage);
    }
  }

  const moved = new Map();
  const moveIfNeeded = async (uploadsUrlPath, relativeDir) => {
    const normalized = normalizePosixPath(uploadsUrlPath);
    if (moved.has(normalized)) {
      return moved.get(normalized);
    }

    const filename = path.posix.basename(normalized);
    const dest = await moveUploadsUrlPath(normalized, { relativeDir, filename });
    moved.set(normalized, dest);
    return dest;
  };

  const imagesDir = path.posix.join('products', folderName, 'images');
  const documentsDir = path.posix.join('products', folderName, 'documents');

  product.images = await Promise.all(
    (product.images || []).map(async (value) => {
      const normalized = normalizePosixPath(value);
      if (normalized.startsWith(PRODUCT_TMP_IMAGES_PREFIX) || isLegacyProductRootFile(normalized)) {
        return moveIfNeeded(normalized, imagesDir);
      }
      return value;
    })
  );

  product.documents = await Promise.all(
    (product.documents || []).map(async (doc) => {
      if (!doc || typeof doc.url !== 'string') return doc;
      const normalized = normalizePosixPath(doc.url);
      if (normalized.startsWith(PRODUCT_TMP_DOCUMENTS_PREFIX)) {
        const movedUrl = await moveIfNeeded(normalized, documentsDir);
        return { ...doc, url: movedUrl };
      }
      return doc;
    })
  );

  if (product.variations && Array.isArray(product.variations)) {
    const variations = [];
    for (const variation of product.variations) {
      if (!variation || typeof variation.image !== 'string') {
        variations.push(variation);
        continue;
      }
      const normalized = normalizePosixPath(variation.image);
      if (normalized.startsWith(PRODUCT_TMP_IMAGES_PREFIX) || isLegacyProductRootFile(normalized)) {
        const movedUrl = await moveIfNeeded(normalized, imagesDir);
        const plain = variation.toObject ? variation.toObject() : variation;
        variations.push({ ...plain, image: movedUrl });
        continue;
      }
      variations.push(variation);
    }
    product.variations = variations;
  }

  if (product.seo && typeof product.seo.openGraphImage === 'string') {
    const normalized = normalizePosixPath(product.seo.openGraphImage);
    if (normalized.startsWith(PRODUCT_TMP_IMAGES_PREFIX) || isLegacyProductRootFile(normalized)) {
      product.seo.openGraphImage = await moveIfNeeded(normalized, imagesDir);
    }
  }
};

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

const specialInventoryStatuses = new Set(['backorder', 'preorder']);

const normalizeInventoryStatus = (inventory) => {
  if (!inventory || typeof inventory !== 'object') {
    return;
  }

  const quantity = typeof inventory.quantity === 'number' ? inventory.quantity : 0;
  const lowStockThreshold = typeof inventory.lowStockThreshold === 'number' ? inventory.lowStockThreshold : 0;
  const allowBackorder = Boolean(inventory.allowBackorder);

  // Manual overrides (admin-controlled)
  if (inventory.status === 'out_of_stock') {
    inventory.allowBackorder = false;
    return;
  }

  if (inventory.status === 'preorder') {
    inventory.allowBackorder = true;
    return;
  }

  if (specialInventoryStatuses.has(inventory.status)) {
    inventory.allowBackorder = true;
    if (quantity <= 0) {
      return;
    }
  }

  if (allowBackorder && quantity <= 0) {
    inventory.status = 'backorder';
    return;
  }

  if (quantity <= 0) {
    inventory.status = 'out_of_stock';
  } else if (quantity <= lowStockThreshold) {
    inventory.status = 'low_stock';
  } else {
    inventory.status = 'in_stock';
  }
};

const listProducts = async (req, res, next) => {
  try {
    const {
      categoryId,
      manufacturerId,
      manufacturerIds,
      tags,
      search,
      includeSerials,
      limit,
      backInStock,
      onSale,
      featured,
      newArrival,
      sort,
      vehicleYear,
      vehicleMake,
      vehicleModel,
      minPrice,
      maxPrice,
    } = req.query;
    const filter = {};
    const andConditions = [];
    const shouldIncludeSerials = String(includeSerials || '').toLowerCase() === 'true';
    const wantsBackInStock = ['true', '1', 'yes'].includes(String(backInStock || '').toLowerCase());
    const wantsOnSale = ['true', '1', 'yes'].includes(String(onSale || '').toLowerCase());
    const wantsFeatured = ['true', '1', 'yes'].includes(String(featured || '').toLowerCase());
    const wantsNewArrival = ['true', '1', 'yes'].includes(String(newArrival || '').toLowerCase());
    const isPrivilegedRequest = Boolean(req.user && ['super_admin', 'admin', 'staff'].includes(req.user.role));

    if (!isPrivilegedRequest) {
      filter.visibility = { $ne: 'hidden' };
    }

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      andConditions.push({ $or: [{ categoryId }, { categoryIds: categoryId }] });
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

    if (wantsFeatured) {
      filter.featured = true;
    }

    if (wantsNewArrival) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - NEW_ARRIVAL_DAYS);
      andConditions.push({ createdAt: { $gte: cutoff } }, { restockedAt: null });
    }

    const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (wantsBackInStock) {
      andConditions.push(
        { restockedAt: { $ne: null } },
        { 'inventory.quantity': { $gt: 0 }, 'inventory.status': { $ne: 'out_of_stock' } }
      );
    }

    if (wantsOnSale) {
      const now = new Date();
      andConditions.push(
        {
          $and: [
            { salePrice: { $ne: null } },
            { $expr: { $lt: ['$salePrice', '$price'] } },
            {
              $or: [
                { saleStartDate: { $exists: false } },
                { saleStartDate: null },
                { saleStartDate: { $lte: now } },
              ],
            },
            {
              $or: [
                { saleEndDate: { $exists: false } },
                { saleEndDate: null },
                { saleEndDate: { $gte: now } },
              ],
            },
          ],
        },
        { 'inventory.quantity': { $gt: 0 }, 'inventory.status': { $ne: 'out_of_stock' } }
      );
    }

    const normalizedSearch = typeof search === 'undefined' ? '' : String(search).trim();
    if (normalizedSearch) {
      const safeSearch = normalizedSearch.slice(0, 128);
      const regex = new RegExp(escapeRegex(safeSearch), 'i');

      const [matchedCategories, matchedManufacturers] = await Promise.all([
        Category.find({ $or: [{ name: regex }, { slug: regex }] }).select('_id'),
        Manufacturer.find({ $or: [{ name: regex }, { slug: regex }] }).select('_id'),
      ]);

      const categoryIdsFromSearch = matchedCategories.map((category) => category._id);
      const manufacturerIdsFromSearch = matchedManufacturers.map((manufacturer) => manufacturer._id);

      const orConditions = [
        { name: regex },
        { sku: regex },
        { productCode: regex },
        { slug: regex },
        { manufacturerName: regex },
        { tags: regex },
        { shortDescription: regex },
        { description: regex },
        { 'variations.sku': regex },
        { 'variations.name': regex },
        { 'specifications.label': regex },
        { 'specifications.value': regex },
        { 'compatibility.make': regex },
        { 'compatibility.model': regex },
        { 'compatibility.subModel': regex },
        { 'compatibility.engine': regex },
        { 'compatibility.notes': regex },
        { featureHighlights: regex },
        { packageContents: regex },
        { 'badges.label': regex },
        { 'badges.description': regex },
      ];

      if (categoryIdsFromSearch.length > 0) {
        orConditions.push(
          { categoryId: { $in: categoryIdsFromSearch } },
          { categoryIds: { $in: categoryIdsFromSearch } }
        );
      }
      if (manufacturerIdsFromSearch.length > 0) {
        orConditions.push({ manufacturerId: { $in: manufacturerIdsFromSearch } });
      }

      andConditions.push({ $or: orConditions });
    }

    // Price filtering (include active sale price)
    if (minPrice || maxPrice) {
      const range = {};
      if (minPrice) {
        const min = parseFloat(minPrice);
        if (!isNaN(min)) {
          range.$gte = min;
        }
      }
      if (maxPrice) {
        const max = parseFloat(maxPrice);
        if (!isNaN(max)) {
          range.$lte = max;
        }
      }
      if (Object.keys(range).length > 0) {
        const now = new Date();
        andConditions.push({
          $or: [
            { price: range },
            {
              $and: [
                { salePrice: range },
                { salePrice: { $ne: null } },
                { $expr: { $lt: ['$salePrice', '$price'] } },
                {
                  $or: [
                    { saleStartDate: { $exists: false } },
                    { saleStartDate: null },
                    { saleStartDate: { $lte: now } },
                  ],
                },
                {
                  $or: [
                    { saleEndDate: { $exists: false } },
                    { saleEndDate: null },
                    { saleEndDate: { $gte: now } },
                  ],
                },
              ],
            },
          ],
        });
      }
    }

    // Vehicle compatibility filtering
    if (vehicleMake || vehicleModel || vehicleYear) {
      if (vehicleMake) {
        filter['compatibility.make'] = { $regex: new RegExp(`^${escapeRegex(vehicleMake)}$`, 'i') };
      }

      if (vehicleModel) {
        filter['compatibility.model'] = { $regex: new RegExp(`^${escapeRegex(vehicleModel)}$`, 'i') };
      }

      if (vehicleYear) {
        const year = parseInt(vehicleYear, 10);
        if (!isNaN(year)) {
          // Match products where:
          // 1. Specific year matches, OR
          // 2. Year falls within yearStart and yearEnd range, OR
          // 3. Year is >= yearStart (if no yearEnd), OR
          // 4. Year is <= yearEnd (if no yearStart)
          andConditions.push({
            $or: [
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
            ],
          });
        }
      }
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const parsedLimit = Number.isFinite(Number(limit)) ? Number.parseInt(limit, 10) : null;
    const effectiveLimit =
      typeof parsedLimit === 'number' && Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : null;

    const normalizedSort = typeof sort === 'undefined' ? '' : String(sort).trim().toLowerCase();
    let sortSpec = { createdAt: -1 };
    if (wantsBackInStock) {
      sortSpec = { restockedAt: -1, createdAt: -1 };
    } else if (normalizedSort === 'price-asc') {
      sortSpec = { price: 1, createdAt: -1 };
    } else if (normalizedSort === 'price-desc') {
      sortSpec = { price: -1, createdAt: -1 };
    } else if (normalizedSort === 'newest') {
      sortSpec = { createdAt: -1 };
    } else if (normalizedSort === 'oldest') {
      sortSpec = { createdAt: 1 };
    } else if (normalizedSort === 'restocked') {
      sortSpec = { restockedAt: -1, createdAt: -1 };
    }

    let query = Product.find(filter).sort(sortSpec);
    if (effectiveLimit) {
      query = query.limit(effectiveLimit);
    }

    const products = await query;
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

    const isPrivilegedRequest = Boolean(req.user && ['super_admin', 'admin', 'staff'].includes(req.user.role));
    if (product.visibility === 'hidden' && !isPrivilegedRequest) {
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

    const manageStock = data.manageStock !== false;
    const normalizedCategoryIds = normalizeCategoryIds(data.categoryId, data.categoryIds);
    const categories = await Category.find({ _id: { $in: normalizedCategoryIds } }).select('_id');
    if (categories.length !== normalizedCategoryIds.length) {
      throw badRequest('One or more categories do not exist');
    }

    const sanitizedTags = sanitizeTags(data.tags);
    const payload = {
      ...data,
      manageStock,
      categoryId: normalizedCategoryIds[0] ?? data.categoryId,
      categoryIds: normalizedCategoryIds,
      tags: sanitizedTags.length ? sanitizedTags : undefined,
      manufacturerId: data.manufacturerId || null,
      saleStartDate: data.saleStartDate ?? undefined,
      saleEndDate: data.saleEndDate ?? undefined,
    };

    if (!manageStock) {
      payload.inventory = null;
    }

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

    normalizeInventoryStatus(product.inventory);
    product.markModified('inventory');

    await relocateProductUploadPaths(product);
    product.markModified('images');
    product.markModified('documents');
    product.markModified('variations');
    product.markModified('seo');
    await product.save();

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

    const previousQuantity =
      product.inventory && typeof product.inventory.quantity === 'number' ? product.inventory.quantity : 0;
    const previousName = product.name;
    const previousUploads = collectProductUploadPaths(product);

    const hasCategoryIdUpdate = typeof data.categoryId !== 'undefined';
    const hasCategoryIdsUpdate = typeof data.categoryIds !== 'undefined';
    if (hasCategoryIdUpdate || hasCategoryIdsUpdate) {
      const existingCategoryIds = Array.isArray(product.categoryIds)
        ? product.categoryIds.map((id) => String(id))
        : [];
      const baseCategoryId = hasCategoryIdUpdate
        ? data.categoryId
        : Array.isArray(data.categoryIds) && data.categoryIds.length
          ? data.categoryIds[0]
          : String(product.categoryId);
      const normalizedCategoryIds = hasCategoryIdsUpdate
        ? normalizeCategoryIds(baseCategoryId, data.categoryIds)
        : normalizeCategoryIds(baseCategoryId, existingCategoryIds);
      const categoriesToValidate = hasCategoryIdsUpdate
        ? normalizedCategoryIds
        : normalizeCategoryIds(baseCategoryId, [baseCategoryId]);
      const categories = await Category.find({ _id: { $in: categoriesToValidate } }).select('_id');
      if (categories.length !== categoriesToValidate.length) {
        throw badRequest('One or more categories do not exist');
      }
      product.categoryId = baseCategoryId;
      product.categoryIds = normalizedCategoryIds;
    }

    if (typeof data.manageStock !== 'undefined') {
      product.manageStock = data.manageStock;
      if (data.manageStock === false) {
        product.inventory = null;
      }
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
      'featured',
      'requiresB2B',
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

    product.tags = sanitizeTags(typeof data.tags !== 'undefined' ? data.tags : product.tags);

    if (typeof data.cost !== 'undefined') {
      product.cost = data.cost === null ? undefined : data.cost;
    }

    if (typeof data.manufacturerId !== 'undefined') {
      product.manufacturerId = data.manufacturerId || null;
    }

    if (typeof data.inventory !== 'undefined') {
      if (product.manageStock === false) {
        product.inventory = null;
      } else {
        product.inventory = data.inventory;
      }
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

    normalizeInventoryStatus(product.inventory);
    product.markModified('inventory');

    const nextQuantity =
      product.inventory && typeof product.inventory.quantity === 'number' ? product.inventory.quantity : 0;
    if (previousQuantity <= 0 && nextQuantity > 0) {
      product.restockedAt = new Date();
    }

    await relocateProductUploadPaths(product, { previousName });
    product.markModified('images');
    product.markModified('documents');
    product.markModified('variations');
    product.markModified('seo');

    await product.save();

    const nextUploads = collectProductUploadPaths(product);
    const toRemove = Array.from(previousUploads).filter((uploadsUrlPath) => {
      const normalized = normalizePosixPath(uploadsUrlPath);
      return normalized.startsWith(PRODUCT_UPLOADS_PREFIX) && !nextUploads.has(normalized);
    });

    await Promise.all(toRemove.map((uploadsUrlPath) => safeUnlinkUploadsUrlPath(uploadsUrlPath)));

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

    const uploads = Array.from(collectProductUploadPaths(product)).filter((uploadsUrlPath) =>
      normalizePosixPath(uploadsUrlPath).startsWith(PRODUCT_UPLOADS_PREFIX)
    );
    await Promise.all(uploads.map((uploadsUrlPath) => safeUnlinkUploadsUrlPath(uploadsUrlPath)));

    const folderName = buildEntityFolderName(product.name, product._id);
    await safeRemoveUploadsDir(path.posix.join('products', folderName));

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

const uploadProductDocument = async (req, res, next) => {
  try {
    if (!req.file || !req.file.filename) {
      throw badRequest('No product document provided');
    }

    const relativePath = path.posix.join('/uploads', 'products', '_tmp', 'documents', req.file.filename);

    res.status(201).json({ data: { path: relativePath } });
  } catch (error) {
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
  uploadProductDocument,
  getVehicleCompatibilityOptions,
};
