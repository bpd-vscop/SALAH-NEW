const Manufacturer = require('../models/Manufacturer');
const { validateCreateManufacturer, validateUpdateManufacturer } = require('../validators/manufacturer');
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
  safeUnlinkUploadsUrlPath,
} = require('../services/mediaStorageService');

const MAX_MARKETING_IMAGE_BYTES = 2 * 1024 * 1024;
const MANUFACTURER_TEMP_DIR = path.posix.join('_tmp', 'manufacturers');

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

const resolveManufacturerFolderFromImagePath = (imageUrl) => {
  const normalized = normalizePosixPath(imageUrl);
  if (!normalized.startsWith('/uploads/manufacturers/')) {
    return null;
  }
  const remainder = normalized.slice('/uploads/manufacturers/'.length);
  const folder = remainder.split('/')[0];
  return folder ? path.posix.join('manufacturers', folder) : null;
};

const listManufacturers = async (_req, res, next) => {
  try {
    const list = await Manufacturer.find({}).sort({ order: 1, createdAt: -1 });
    res.json({ manufacturers: list.map((m) => m.toJSON()) });
  } catch (err) {
    next(err);
  }
};

const createManufacturer = async (req, res, next) => {
  try {
    const data = validateCreateManufacturer(req.body || {});
    const slug = slugify(data.name);
    const exists = await Manufacturer.findOne({ slug });
    if (exists) {
      throw badRequest('Manufacturer with the same name already exists');
    }

    const manufacturer = new Manufacturer({
      name: data.name,
      slug,
      logoImage: data.logoImage,
      heroImage: data.heroImage || '',
      order: data.order || 0,
      isActive: data.isActive !== false,
    });

    const folderName = buildEntityFolderName(manufacturer.name, manufacturer._id);
    if (data.logoImage.startsWith('/uploads/_tmp/')) {
      manufacturer.logoImage = await moveUploadsUrlPath(data.logoImage, {
        relativeDir: path.posix.join('manufacturers', folderName, 'images'),
        filename: 'logo.webp',
      });
    } else {
      manufacturer.logoImage = data.logoImage;
    }

    if (data.heroImage && data.heroImage !== '') {
      if (data.heroImage.startsWith('/uploads/_tmp/')) {
        manufacturer.heroImage = await moveUploadsUrlPath(data.heroImage, {
          relativeDir: path.posix.join('manufacturers', folderName, 'images'),
          filename: 'hero.webp',
        });
      } else {
        manufacturer.heroImage = data.heroImage;
      }
    } else {
      manufacturer.heroImage = '';
    }

    await manufacturer.save();

    res.status(201).json({ manufacturer: manufacturer.toJSON() });
  } catch (err) {
    next(err);
  }
};

const updateManufacturer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateManufacturer(req.body || {});
    const manufacturer = await Manufacturer.findById(id);
    if (!manufacturer) throw notFound('Manufacturer not found');

    const previousName = manufacturer.name;

    if (data.name && data.name !== manufacturer.name) {
      const nextSlug = slugify(data.name);
      const exists = await Manufacturer.findOne({ slug: nextSlug, _id: { $ne: id } });
      if (exists) throw badRequest('Manufacturer with the same name already exists');
      manufacturer.name = data.name;
      manufacturer.slug = nextSlug;
    }

    const previousFolderName = buildEntityFolderName(previousName, manufacturer._id);
    const nextFolderName = buildEntityFolderName(manufacturer.name, manufacturer._id);
    if (previousFolderName !== nextFolderName) {
      await renameUploadsDirIfExists(
        path.posix.join('manufacturers', previousFolderName),
        path.posix.join('manufacturers', nextFolderName)
      );

      const expectedPrefix = `/uploads/manufacturers/${previousFolderName}/`;
      if (manufacturer.logoImage && normalizePosixPath(manufacturer.logoImage).startsWith(expectedPrefix)) {
        manufacturer.logoImage = normalizePosixPath(manufacturer.logoImage).replace(
          expectedPrefix,
          `/uploads/manufacturers/${nextFolderName}/`
        );
      }
      if (manufacturer.heroImage && normalizePosixPath(manufacturer.heroImage).startsWith(expectedPrefix)) {
        manufacturer.heroImage = normalizePosixPath(manufacturer.heroImage).replace(
          expectedPrefix,
          `/uploads/manufacturers/${nextFolderName}/`
        );
      }
    }

    if (typeof data.logoImage !== 'undefined') {
      if (data.logoImage && data.logoImage.startsWith('/uploads/_tmp/')) {
        manufacturer.logoImage = await moveUploadsUrlPath(data.logoImage, {
          relativeDir: path.posix.join('manufacturers', nextFolderName, 'images'),
          filename: 'logo.webp',
        });
      } else if (data.logoImage) {
        manufacturer.logoImage = data.logoImage;
      }
    }

    if (typeof data.heroImage !== 'undefined') {
      if (!data.heroImage) {
        if (manufacturer.heroImage && normalizePosixPath(manufacturer.heroImage).startsWith('/uploads/')) {
          await safeUnlinkUploadsUrlPath(manufacturer.heroImage);
        }
        manufacturer.heroImage = '';
      } else if (data.heroImage.startsWith('/uploads/_tmp/')) {
        manufacturer.heroImage = await moveUploadsUrlPath(data.heroImage, {
          relativeDir: path.posix.join('manufacturers', nextFolderName, 'images'),
          filename: 'hero.webp',
        });
      } else {
        manufacturer.heroImage = data.heroImage;
      }
    }

    if (typeof data.order !== 'undefined') manufacturer.order = data.order;
    if (typeof data.isActive !== 'undefined') manufacturer.isActive = data.isActive;

    await manufacturer.save();
    res.json({ manufacturer: manufacturer.toJSON() });
  } catch (err) {
    next(err);
  }
};

const deleteManufacturer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = await Manufacturer.findByIdAndDelete(id);
    if (!removed) throw notFound('Manufacturer not found');

    const folderFromPath = resolveManufacturerFolderFromImagePath(removed.logoImage) || resolveManufacturerFolderFromImagePath(removed.heroImage);
    if (folderFromPath) {
      await safeRemoveUploadsDir(folderFromPath);
    } else {
      const folderName = buildEntityFolderName(removed.name, removed._id);
      await safeRemoveUploadsDir(path.posix.join('manufacturers', folderName));
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listManufacturers,
  createManufacturer,
  updateManufacturer,
  deleteManufacturer,
  uploadManufacturerLogo: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        throw badRequest('No manufacturer logo provided');
      }

      const filename = `manufacturer-logo-${Date.now()}-${randomUUID()}.webp`;
      const relativePath = await saveWebpImage(req.file.buffer, {
        relativeDir: MANUFACTURER_TEMP_DIR,
        filename,
        maxBytes: MAX_MARKETING_IMAGE_BYTES,
      });

      res.status(201).json({ data: { path: relativePath } });
    } catch (error) {
      next(error);
    }
  },
  uploadManufacturerHero: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        throw badRequest('No manufacturer hero image provided');
      }

      const filename = `manufacturer-hero-${Date.now()}-${randomUUID()}.webp`;
      const relativePath = await saveWebpImage(req.file.buffer, {
        relativeDir: MANUFACTURER_TEMP_DIR,
        filename,
        maxBytes: MAX_MARKETING_IMAGE_BYTES,
      });

      res.status(201).json({ data: { path: relativePath } });
    } catch (error) {
      next(error);
    }
  },
};
