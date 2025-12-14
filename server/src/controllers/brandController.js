const Brand = require('../models/Brand');
const { validateCreateBrand, validateUpdateBrand } = require('../validators/brand');
const { slugify } = require('../utils/slugify');
const { badRequest, notFound } = require('../utils/appError');
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

const MAX_MARKETING_IMAGE_BYTES = 2 * 1024 * 1024;
const BRAND_TEMP_DIR = path.posix.join('_tmp', 'brands');

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

const resolveBrandFolderFromLogoPath = (logoImage) => {
  const normalized = normalizePosixPath(logoImage);
  if (!normalized.startsWith('/uploads/brands/')) {
    return null;
  }
  const remainder = normalized.slice('/uploads/brands/'.length);
  const folder = remainder.split('/')[0];
  return folder ? path.posix.join('brands', folder) : null;
};

const listBrands = async (_req, res, next) => {
  try {
    const list = await Brand.find({}).sort({ order: 1, createdAt: -1 });
    res.json({ brands: list.map((b) => b.toJSON()) });
  } catch (err) {
    next(err);
  }
};

const createBrand = async (req, res, next) => {
  try {
    const data = validateCreateBrand(req.body || {});
    const slug = slugify(data.name);
    const exists = await Brand.findOne({ slug });
    if (exists) {
      throw badRequest('Brand with the same name already exists');
    }

    const brand = new Brand({
      name: data.name,
      slug,
      logoImage: data.logoImage,
      order: data.order || 0,
      isActive: data.isActive !== false,
    });

    const folderName = buildEntityFolderName(brand.name, brand._id);
    if (data.logoImage.startsWith('/uploads/_tmp/')) {
      brand.logoImage = await moveUploadsUrlPath(data.logoImage, {
        relativeDir: path.posix.join('brands', folderName, 'images'),
        filename: 'logo.webp',
      });
    } else {
      brand.logoImage = data.logoImage;
    }

    await brand.save();

    res.status(201).json({ brand: brand.toJSON() });
  } catch (err) {
    next(err);
  }
};

const updateBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateBrand(req.body || {});
    const brand = await Brand.findById(id);
    if (!brand) throw notFound('Brand not found');

    const previousName = brand.name;

    if (data.name && data.name !== brand.name) {
      const nextSlug = slugify(data.name);
      const exists = await Brand.findOne({ slug: nextSlug, _id: { $ne: id } });
      if (exists) throw badRequest('Brand with the same name already exists');
      brand.name = data.name;
      brand.slug = nextSlug;
    }

    const previousFolderName = buildEntityFolderName(previousName, brand._id);
    const nextFolderName = buildEntityFolderName(brand.name, brand._id);
    if (previousFolderName !== nextFolderName) {
      await renameUploadsDirIfExists(
        path.posix.join('brands', previousFolderName),
        path.posix.join('brands', nextFolderName)
      );

      const expectedPrefix = `/uploads/brands/${previousFolderName}/`;
      if (brand.logoImage && normalizePosixPath(brand.logoImage).startsWith(expectedPrefix)) {
        brand.logoImage = normalizePosixPath(brand.logoImage).replace(
          expectedPrefix,
          `/uploads/brands/${nextFolderName}/`
        );
      }
    }

    if (typeof data.logoImage !== 'undefined') {
      if (data.logoImage && data.logoImage.startsWith('/uploads/_tmp/')) {
        brand.logoImage = await moveUploadsUrlPath(data.logoImage, {
          relativeDir: path.posix.join('brands', nextFolderName, 'images'),
          filename: 'logo.webp',
        });
      } else if (data.logoImage) {
        brand.logoImage = data.logoImage;
      }
    }
    if (typeof data.order !== 'undefined') brand.order = data.order;
    if (typeof data.isActive !== 'undefined') brand.isActive = data.isActive;

    await brand.save();
    res.json({ brand: brand.toJSON() });
  } catch (err) {
    next(err);
  }
};

const deleteBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = await Brand.findByIdAndDelete(id);
    if (!removed) throw notFound('Brand not found');

    const folderFromPath = resolveBrandFolderFromLogoPath(removed.logoImage);
    if (folderFromPath) {
      await safeRemoveUploadsDir(folderFromPath);
    } else {
      const folderName = buildEntityFolderName(removed.name, removed._id);
      await safeRemoveUploadsDir(path.posix.join('brands', folderName));
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

const uploadBrandLogo = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      throw badRequest('No logo image provided');
    }

    const filename = `brand-logo-${Date.now()}-${randomUUID()}.webp`;
    const relativePath = await saveWebpImage(req.file.buffer, {
      relativeDir: BRAND_TEMP_DIR,
      filename,
      maxBytes: MAX_MARKETING_IMAGE_BYTES,
    });

    res.status(201).json({ data: { path: relativePath } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  uploadBrandLogo,
};
