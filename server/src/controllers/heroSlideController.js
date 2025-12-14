const HeroSlide = require('../models/HeroSlide');
const {
  validateCreateHeroSlide,
  validateUpdateHeroSlide,
} = require('../validators/heroSlide');
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

const MAX_SLIDES = 5;
const MAX_MARKETING_IMAGE_BYTES = 2 * 1024 * 1024;
const HERO_SLIDE_TEMP_DIR = path.posix.join('_tmp', 'hero-slides');

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

const resolveHeroSlideFolderFromImagePath = (imageUrl) => {
  const normalized = normalizePosixPath(imageUrl);
  if (!normalized.startsWith('/uploads/home/hero-slides/')) {
    return null;
  }
  const remainder = normalized.slice('/uploads/home/hero-slides/'.length);
  const folder = remainder.split('/')[0];
  return folder ? path.posix.join('home', 'hero-slides', folder) : null;
};

const saveHeroSlideTempImage = async (fileBuffer, filenamePrefix) => {
  const filename = `${filenamePrefix}-${Date.now()}-${randomUUID()}.webp`;
  return saveWebpImage(fileBuffer, {
    relativeDir: HERO_SLIDE_TEMP_DIR,
    filename,
    maxBytes: MAX_MARKETING_IMAGE_BYTES,
  });
};

const enforceSlideLimit = async () => {
  const slides = await HeroSlide.find().sort({ updatedAt: -1, createdAt: -1 });
  if (slides.length <= MAX_SLIDES) {
    return;
  }

  const excess = slides.slice(MAX_SLIDES);
  const idsToRemove = excess.map((slide) => slide._id);
  if (idsToRemove.length) {
    await Promise.all(
      excess.map(async (slide) => {
        const folder =
          resolveHeroSlideFolderFromImagePath(slide.desktopImage) ||
          resolveHeroSlideFolderFromImagePath(slide.mobileImage) ||
          path.posix.join('home', 'hero-slides', buildEntityFolderName(slide.title, slide._id));
        await safeRemoveUploadsDir(folder);
      })
    );
    await HeroSlide.deleteMany({ _id: { $in: idsToRemove } });
  }
};

const listHeroSlides = async (_req, res, next) => {
  try {
    const slides = await HeroSlide.find().sort({ order: 1, createdAt: -1 });
    res.json({ slides: slides.map((slide) => slide.toJSON()) });
  } catch (error) {
    next(error);
  }
};

const createHeroSlide = async (req, res, next) => {
  try {
    const data = validateCreateHeroSlide(req.body || {});

    const slide = new HeroSlide(data);
    const folderName = buildEntityFolderName(slide.title, slide._id);

    if (data.desktopImage && data.desktopImage.startsWith('/uploads/_tmp/')) {
      slide.desktopImage = await moveUploadsUrlPath(data.desktopImage, {
        relativeDir: path.posix.join('home', 'hero-slides', folderName, 'images'),
        filename: 'desktop.webp',
      });
    }

    if (data.mobileImage && data.mobileImage.startsWith('/uploads/_tmp/')) {
      slide.mobileImage = await moveUploadsUrlPath(data.mobileImage, {
        relativeDir: path.posix.join('home', 'hero-slides', folderName, 'images'),
        filename: 'mobile.webp',
      });
    }

    await slide.save();

    await enforceSlideLimit();
    res.status(201).json({ slide: slide.toJSON() });
  } catch (error) {
    next(error);
  }
};

const updateHeroSlide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateHeroSlide(req.body || {});
    const slide = await HeroSlide.findById(id);
    if (!slide) throw notFound('Hero slide not found');

    const previousTitle = slide.title;

    Object.entries(data).forEach(([key, value]) => {
      if (typeof value !== 'undefined') {
        slide[key] = value;
      }
    });

    const previousFolderName = buildEntityFolderName(previousTitle, slide._id);
    const nextFolderName = buildEntityFolderName(slide.title, slide._id);
    if (previousFolderName !== nextFolderName) {
      await renameUploadsDirIfExists(
        path.posix.join('home', 'hero-slides', previousFolderName),
        path.posix.join('home', 'hero-slides', nextFolderName)
      );

      const expectedPrefix = `/uploads/home/hero-slides/${previousFolderName}/`;
      if (slide.desktopImage && normalizePosixPath(slide.desktopImage).startsWith(expectedPrefix)) {
        slide.desktopImage = normalizePosixPath(slide.desktopImage).replace(
          expectedPrefix,
          `/uploads/home/hero-slides/${nextFolderName}/`
        );
      }
      if (slide.mobileImage && normalizePosixPath(slide.mobileImage).startsWith(expectedPrefix)) {
        slide.mobileImage = normalizePosixPath(slide.mobileImage).replace(
          expectedPrefix,
          `/uploads/home/hero-slides/${nextFolderName}/`
        );
      }
    }

    if (typeof data.desktopImage !== 'undefined' && data.desktopImage) {
      if (data.desktopImage.startsWith('/uploads/_tmp/')) {
        slide.desktopImage = await moveUploadsUrlPath(data.desktopImage, {
          relativeDir: path.posix.join('home', 'hero-slides', nextFolderName, 'images'),
          filename: 'desktop.webp',
        });
      } else {
        slide.desktopImage = data.desktopImage;
      }
    }

    if (typeof data.mobileImage !== 'undefined' && data.mobileImage) {
      if (data.mobileImage.startsWith('/uploads/_tmp/')) {
        slide.mobileImage = await moveUploadsUrlPath(data.mobileImage, {
          relativeDir: path.posix.join('home', 'hero-slides', nextFolderName, 'images'),
          filename: 'mobile.webp',
        });
      } else {
        slide.mobileImage = data.mobileImage;
      }
    }

    await slide.save();

    res.json({ slide: slide.toJSON() });
  } catch (error) {
    next(error);
  }
};

const deleteHeroSlide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const slide = await HeroSlide.findByIdAndDelete(id);
    if (!slide) {
      throw notFound('Hero slide not found');
    }

    const folderFromPath =
      resolveHeroSlideFolderFromImagePath(slide.desktopImage) ||
      resolveHeroSlideFolderFromImagePath(slide.mobileImage);
    if (folderFromPath) {
      await safeRemoveUploadsDir(folderFromPath);
    } else {
      const folderName = buildEntityFolderName(slide.title, slide._id);
      await safeRemoveUploadsDir(path.posix.join('home', 'hero-slides', folderName));
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  uploadHeroDesktopImage: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        throw badRequest('No desktop image provided');
      }

      const relativePath = await saveHeroSlideTempImage(req.file.buffer, 'hero-desktop');
      res.status(201).json({ data: { path: relativePath } });
    } catch (error) {
      next(error);
    }
  },
  uploadHeroMobileImage: async (req, res, next) => {
    try {
      if (!req.file || !req.file.buffer) {
        throw badRequest('No mobile image provided');
      }

      const relativePath = await saveHeroSlideTempImage(req.file.buffer, 'hero-mobile');
      res.status(201).json({ data: { path: relativePath } });
    } catch (error) {
      next(error);
    }
  },
};
