const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { validateCreateCategory, validateUpdateCategory } = require('../validators/category');
const { slugify } = require('../utils/slugify');
const { notFound, badRequest } = require('../utils/appError');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const {
  uploadsRoot,
  buildEntityFolderName,
  pathExists,
  saveWebpImage,
  moveUploadsUrlPath,
  normalizePosixPath,
  safeRemoveUploadsDir,
  safeUnlinkUploadsUrlPath,
} = require('../services/mediaStorageService');

const MAX_MARKETING_IMAGE_BYTES = 2 * 1024 * 1024;
const CATEGORY_TEMP_DIR = path.posix.join('_tmp', 'categories');

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

const resolveCategoryFolderFromImagePath = (imageUrl) => {
  const normalized = normalizePosixPath(imageUrl);
  if (!normalized.startsWith('/uploads/categories/')) {
    return null;
  }
  const remainder = normalized.slice('/uploads/categories/'.length);
  const folder = remainder.split('/')[0];
  return folder ? path.posix.join('categories', folder) : null;
};

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

    const category = new Category({
      name: data.name,
      parentId: data.parentId || null,
      slug,
      imageUrl: data.imageUrl || null,
      heroImageUrl: data.heroImageUrl || null,
    });

    const folderName = buildEntityFolderName(category.name, category._id);

    if (data.imageUrl && data.imageUrl.startsWith('/uploads/_tmp/')) {
      category.imageUrl = await moveUploadsUrlPath(data.imageUrl, {
        relativeDir: path.posix.join('categories', folderName, 'images'),
        filename: 'image.webp',
      });
    }

    if (data.heroImageUrl && data.heroImageUrl.startsWith('/uploads/_tmp/')) {
      category.heroImageUrl = await moveUploadsUrlPath(data.heroImageUrl, {
        relativeDir: path.posix.join('categories', folderName, 'images'),
        filename: 'hero.webp',
      });
    }

    await category.save();

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

    const previousName = category.name;

    if (data.name && data.name !== category.name) {
      const slug = slugify(data.name);
      const exists = await Category.findOne({ slug, _id: { $ne: id } });
      if (exists) {
        throw badRequest('Category with the same name already exists');
      }
      category.name = data.name;
      category.slug = slug;
    }

    const previousFolderName = buildEntityFolderName(previousName, category._id);
    const nextFolderName = buildEntityFolderName(category.name, category._id);
    if (previousFolderName !== nextFolderName) {
      await renameUploadsDirIfExists(
        path.posix.join('categories', previousFolderName),
        path.posix.join('categories', nextFolderName)
      );

      const expectedPrefix = `/uploads/categories/${previousFolderName}/`;
      if (category.imageUrl && normalizePosixPath(category.imageUrl).startsWith(expectedPrefix)) {
        category.imageUrl = normalizePosixPath(category.imageUrl).replace(
          expectedPrefix,
          `/uploads/categories/${nextFolderName}/`
        );
      }
      if (category.heroImageUrl && normalizePosixPath(category.heroImageUrl).startsWith(expectedPrefix)) {
        category.heroImageUrl = normalizePosixPath(category.heroImageUrl).replace(
          expectedPrefix,
          `/uploads/categories/${nextFolderName}/`
        );
      }
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
      if (!data.imageUrl) {
        if (category.imageUrl && normalizePosixPath(category.imageUrl).startsWith('/uploads/')) {
          await safeUnlinkUploadsUrlPath(category.imageUrl);
        }
        category.imageUrl = null;
      } else if (data.imageUrl.startsWith('/uploads/_tmp/')) {
        category.imageUrl = await moveUploadsUrlPath(data.imageUrl, {
          relativeDir: path.posix.join('categories', nextFolderName, 'images'),
          filename: 'image.webp',
        });
      } else {
        category.imageUrl = data.imageUrl;
      }
    }

    if (typeof data.heroImageUrl !== 'undefined') {
      if (!data.heroImageUrl) {
        if (category.heroImageUrl && normalizePosixPath(category.heroImageUrl).startsWith('/uploads/')) {
          await safeUnlinkUploadsUrlPath(category.heroImageUrl);
        }
        category.heroImageUrl = null;
      } else if (data.heroImageUrl.startsWith('/uploads/_tmp/')) {
        category.heroImageUrl = await moveUploadsUrlPath(data.heroImageUrl, {
          relativeDir: path.posix.join('categories', nextFolderName, 'images'),
          filename: 'hero.webp',
        });
      } else {
        category.heroImageUrl = data.heroImageUrl;
      }
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

    const folderFromPath =
      resolveCategoryFolderFromImagePath(category.imageUrl) ||
      resolveCategoryFolderFromImagePath(category.heroImageUrl);
    if (folderFromPath) {
      await safeRemoveUploadsDir(folderFromPath);
    } else {
      const folderName = buildEntityFolderName(category.name, category._id);
      await safeRemoveUploadsDir(path.posix.join('categories', folderName));
    }

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
  uploadCategoryImage: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        throw badRequest('No category image provided');
      }

      const filename = `category-image-${Date.now()}-${randomUUID()}.webp`;
      const relativePath = await saveWebpImage(req.file.buffer, {
        relativeDir: CATEGORY_TEMP_DIR,
        filename,
        maxBytes: MAX_MARKETING_IMAGE_BYTES,
      });

      res.status(201).json({ data: { path: relativePath } });
    } catch (error) {
      next(error);
    }
  },
  uploadCategoryHeroImage: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        throw badRequest('No category hero image provided');
      }

      const filename = `category-hero-${Date.now()}-${randomUUID()}.webp`;
      const relativePath = await saveWebpImage(req.file.buffer, {
        relativeDir: CATEGORY_TEMP_DIR,
        filename,
        maxBytes: MAX_MARKETING_IMAGE_BYTES,
      });

      res.status(201).json({ data: { path: relativePath } });
    } catch (error) {
      next(error);
    }
  },
};
