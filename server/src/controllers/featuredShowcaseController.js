const FeaturedShowcase = require('../models/FeaturedShowcase');
const {
  validateCreateFeatured,
  validateUpdateFeatured,
} = require('../validators/featuredShowcase');
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
} = require('../services/mediaStorageService');

const MAX_ITEMS_PER_VARIANT = {
  feature: 3,
  tile: 4,
};

const MAX_MARKETING_IMAGE_BYTES = 2 * 1024 * 1024;
const FEATURED_TEMP_DIR = path.posix.join('_tmp', 'featured-showcase');

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

const resolveFeaturedFolderFromImagePath = (imageUrl) => {
  const normalized = normalizePosixPath(imageUrl);
  if (!normalized.startsWith('/uploads/home/featured-showcase/')) {
    return null;
  }
  const remainder = normalized.slice('/uploads/home/featured-showcase/'.length);
  const [variant, folder] = remainder.split('/');
  if (!variant || !folder) {
    return null;
  }
  return path.posix.join('home', 'featured-showcase', variant, folder);
};

const enforceVariantLimit = async (variant) => {
  const items = await FeaturedShowcase.find({ variant }).sort({ updatedAt: -1, createdAt: -1 });
  const limit = MAX_ITEMS_PER_VARIANT[variant] ?? 3;
  if (items.length <= limit) {
    return;
  }

  const excess = items.slice(limit);
  const idsToRemove = excess.map((item) => item._id);
  if (idsToRemove.length) {
    await Promise.all(
      excess.map(async (item) => {
        const folder =
          resolveFeaturedFolderFromImagePath(item.image) ||
          path.posix.join(
            'home',
            'featured-showcase',
            item.variant,
            buildEntityFolderName(item.title, item._id)
          );
        await safeRemoveUploadsDir(folder);
      })
    );
    await FeaturedShowcase.deleteMany({ _id: { $in: idsToRemove } });
  }
};

const listFeaturedShowcase = async (_req, res, next) => {
  try {
    const items = await FeaturedShowcase.find().sort({ variant: 1, order: 1, createdAt: -1 });
    res.json({ items: items.map((item) => item.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const createFeaturedShowcase = async (req, res, next) => {
  try {
    const data = validateCreateFeatured(req.body || {});

    const item = new FeaturedShowcase(data);
    const folderName = buildEntityFolderName(item.title, item._id);

    if (data.image && data.image.startsWith('/uploads/_tmp/')) {
      item.image = await moveUploadsUrlPath(data.image, {
        relativeDir: path.posix.join('home', 'featured-showcase', item.variant, folderName, 'images'),
        filename: 'image.webp',
      });
    }

    await item.save();

    await enforceVariantLimit(item.variant);
    res.status(201).json({ item: item.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateFeaturedShowcase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateFeatured(req.body || {});
    const item = await FeaturedShowcase.findById(id);
    if (!item) throw notFound('Featured showcase item not found');

    const previousTitle = item.title;
    const previousVariant = item.variant;

    Object.entries(data).forEach(([key, value]) => {
      if (typeof value !== 'undefined') {
        item[key] = value;
      }
    });

    const previousFolderName = buildEntityFolderName(previousTitle, item._id);
    const nextFolderName = buildEntityFolderName(item.title, item._id);
    const previousDir = path.posix.join('home', 'featured-showcase', previousVariant, previousFolderName);
    const nextDir = path.posix.join('home', 'featured-showcase', item.variant, nextFolderName);
    if (previousDir !== nextDir) {
      await renameUploadsDirIfExists(previousDir, nextDir);

      const expectedPrefix = `/uploads/home/featured-showcase/${previousVariant}/${previousFolderName}/`;
      if (item.image && normalizePosixPath(item.image).startsWith(expectedPrefix)) {
        item.image = normalizePosixPath(item.image).replace(
          expectedPrefix,
          `/uploads/home/featured-showcase/${item.variant}/${nextFolderName}/`
        );
      }
    }

    if (typeof data.image !== 'undefined' && data.image) {
      if (data.image.startsWith('/uploads/_tmp/')) {
        item.image = await moveUploadsUrlPath(data.image, {
          relativeDir: path.posix.join('home', 'featured-showcase', item.variant, nextFolderName, 'images'),
          filename: 'image.webp',
        });
      } else {
        item.image = data.image;
      }
    }

    await item.save();

    if (previousVariant !== item.variant) {
      await enforceVariantLimit(previousVariant);
    }
    await enforceVariantLimit(item.variant);
    res.json({ item: item.toJSON() });
  } catch (error) {
    next(error);
  }
};

const deleteFeaturedShowcase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await FeaturedShowcase.findByIdAndDelete(id);
    if (!item) {
      throw notFound('Featured showcase item not found');
    }

    const folderFromPath = resolveFeaturedFolderFromImagePath(item.image);
    if (folderFromPath) {
      await safeRemoveUploadsDir(folderFromPath);
    } else {
      const folderName = buildEntityFolderName(item.title, item._id);
      await safeRemoveUploadsDir(path.posix.join('home', 'featured-showcase', item.variant, folderName));
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listFeaturedShowcase,
  createFeaturedShowcase,
  updateFeaturedShowcase,
  deleteFeaturedShowcase,
  uploadFeaturedShowcaseImage: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        throw badRequest('No featured image provided');
      }

      const filename = `featured-image-${Date.now()}-${randomUUID()}.webp`;
      const relativePath = await saveWebpImage(req.file.buffer, {
        relativeDir: FEATURED_TEMP_DIR,
        filename,
        maxBytes: MAX_MARKETING_IMAGE_BYTES,
      });

      res.status(201).json({ data: { path: relativePath } });
    } catch (error) {
      next(error);
    }
  },
};
