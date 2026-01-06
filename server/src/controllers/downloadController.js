const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const DownloadEntry = require('../models/DownloadEntry');
const { validateCreateDownload, validateUpdateDownload } = require('../validators/download');
const { slugify } = require('../utils/slugify');
const { badRequest, notFound } = require('../utils/appError');
const {
  uploadsRoot,
  buildEntityFolderName,
  pathExists,
  saveWebpImage,
  moveUploadsUrlPath,
  normalizePosixPath,
  safeUnlinkUploadsUrlPath,
  safeRemoveUploadsDir,
} = require('../services/mediaStorageService');

const MAX_MARKETING_IMAGE_BYTES = 2 * 1024 * 1024;
const DOWNLOAD_TEMP_DIR = path.posix.join('_tmp', 'downloads');

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

const resolveDownloadFolderFromImagePath = (imageUrl) => {
  const normalized = normalizePosixPath(imageUrl);
  if (!normalized.startsWith('/uploads/downloads/')) {
    return null;
  }
  const remainder = normalized.slice('/uploads/downloads/'.length);
  const folder = remainder.split('/')[0];
  return folder ? path.posix.join('downloads', folder) : null;
};

const normalizeLinks = (links = []) =>
  links.map((link) => ({
    label: typeof link.label === 'string' ? link.label.trim() : '',
    url: typeof link.url === 'string' ? link.url.trim() : '',
  }));

const listDownloads = async (_req, res, next) => {
  try {
    const list = await DownloadEntry.find({}).sort({ createdAt: -1 });
    res.json({ downloads: list.map((entry) => entry.toJSON()) });
  } catch (err) {
    next(err);
  }
};

const getDownloadBySlug = async (req, res, next) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const entry = await DownloadEntry.findOne({ slug });
    if (!entry) {
      throw notFound('Download not found');
    }
    res.json({ download: entry.toJSON() });
  } catch (err) {
    next(err);
  }
};

const createDownload = async (req, res, next) => {
  try {
    const data = validateCreateDownload(req.body || {});
    const slug = slugify(data.name);
    const exists = await DownloadEntry.findOne({ slug });
    if (exists) {
      throw badRequest('Download with the same name already exists');
    }

    const entry = new DownloadEntry({
      name: data.name,
      slug,
      description: data.description || '',
      image: data.image || '',
      links: normalizeLinks(data.links),
    });

    const folderName = buildEntityFolderName(entry.name, entry._id);
    if (data.image) {
      if (data.image.startsWith('/uploads/_tmp/')) {
        entry.image = await moveUploadsUrlPath(data.image, {
          relativeDir: path.posix.join('downloads', folderName, 'images'),
          filename: 'image.webp',
        });
      } else {
        entry.image = data.image;
      }
    }

    await entry.save();
    res.status(201).json({ download: entry.toJSON() });
  } catch (err) {
    next(err);
  }
};

const updateDownload = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = validateUpdateDownload(req.body || {});
    const entry = await DownloadEntry.findById(id);
    if (!entry) {
      throw notFound('Download not found');
    }

    const previousName = entry.name;
    if (data.name && data.name !== entry.name) {
      const nextSlug = slugify(data.name);
      const exists = await DownloadEntry.findOne({ slug: nextSlug, _id: { $ne: id } });
      if (exists) {
        throw badRequest('Download with the same name already exists');
      }
      entry.name = data.name;
      entry.slug = nextSlug;
    }

    const previousFolderName = buildEntityFolderName(previousName, entry._id);
    const nextFolderName = buildEntityFolderName(entry.name, entry._id);
    if (previousFolderName !== nextFolderName) {
      await renameUploadsDirIfExists(
        path.posix.join('downloads', previousFolderName),
        path.posix.join('downloads', nextFolderName)
      );

      const expectedPrefix = `/uploads/downloads/${previousFolderName}/`;
      if (entry.image && normalizePosixPath(entry.image).startsWith(expectedPrefix)) {
        entry.image = normalizePosixPath(entry.image).replace(
          expectedPrefix,
          `/uploads/downloads/${nextFolderName}/`
        );
      }
    }

    if (typeof data.description !== 'undefined') {
      entry.description = data.description || '';
    }

    if (typeof data.image !== 'undefined') {
      if (!data.image) {
        if (entry.image && normalizePosixPath(entry.image).startsWith('/uploads/')) {
          await safeUnlinkUploadsUrlPath(entry.image);
        }
        entry.image = '';
      } else if (data.image.startsWith('/uploads/_tmp/')) {
        entry.image = await moveUploadsUrlPath(data.image, {
          relativeDir: path.posix.join('downloads', nextFolderName, 'images'),
          filename: 'image.webp',
        });
      } else {
        entry.image = data.image;
      }
    }

    if (typeof data.links !== 'undefined') {
      entry.links = normalizeLinks(data.links);
    }

    await entry.save();
    res.json({ download: entry.toJSON() });
  } catch (err) {
    next(err);
  }
};

const deleteDownload = async (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = await DownloadEntry.findByIdAndDelete(id);
    if (!removed) {
      throw notFound('Download not found');
    }

    const folderFromPath = resolveDownloadFolderFromImagePath(removed.image);
    if (folderFromPath) {
      await safeRemoveUploadsDir(folderFromPath);
    } else {
      const folderName = buildEntityFolderName(removed.name, removed._id);
      await safeRemoveUploadsDir(path.posix.join('downloads', folderName));
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

const uploadDownloadImage = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      throw badRequest('No download image provided');
    }

    const filename = `download-image-${Date.now()}-${randomUUID()}.webp`;
    const relativePath = await saveWebpImage(req.file.buffer, {
      relativeDir: DOWNLOAD_TEMP_DIR,
      filename,
      maxBytes: MAX_MARKETING_IMAGE_BYTES,
    });

    res.status(201).json({ data: { path: relativePath } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listDownloads,
  getDownloadBySlug,
  createDownload,
  updateDownload,
  deleteDownload,
  uploadDownloadImage,
};
