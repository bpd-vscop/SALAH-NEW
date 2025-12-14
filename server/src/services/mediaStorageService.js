const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { randomUUID } = require('crypto');
const { slugify } = require('../utils/slugify');

const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');

const MAX_IMAGE_BYTES_DEFAULT = 1024 * 1024;
const QUALITY_STEPS = [85, 80, 75, 70, 65, 60, 55, 50, 45];
const WIDTH_STEPS = [2400, 2000, 1800, 1600, 1400, 1200, 1000, 800, 600];

class ImageOptimizationError extends Error {}

const ensureDirectory = async (absoluteDirectory) => {
  await fs.promises.mkdir(absoluteDirectory, { recursive: true });
};

const normalizePosixPath = (value) => String(value || '').trim().replace(/\\/g, '/');

const toUploadsRelativePosixPath = (uploadsUrlPath) => {
  const normalized = normalizePosixPath(uploadsUrlPath);
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith('/uploads/')) {
    return normalized.slice('/uploads/'.length);
  }
  if (normalized.startsWith('uploads/')) {
    return normalized.slice('uploads/'.length);
  }
  return null;
};

const toUploadsUrlPath = (relativePosixPath) => {
  const normalized = normalizePosixPath(relativePosixPath).replace(/^\/+/, '');
  if (!normalized) {
    return null;
  }
  return `/${path.posix.join('uploads', normalized)}`;
};

const resolveUploadsAbsolutePath = (uploadsUrlPath) => {
  const relPosixPath = toUploadsRelativePosixPath(uploadsUrlPath);
  if (!relPosixPath) {
    return null;
  }

  const absolutePath = path.resolve(uploadsRoot, ...relPosixPath.split('/'));
  const relativeCheck = path.relative(uploadsRoot, absolutePath);
  if (
    relativeCheck.startsWith('..') ||
    path.isAbsolute(relativeCheck) ||
    relativeCheck.includes('..' + path.sep)
  ) {
    throw new Error('Invalid uploads path');
  }
  return absolutePath;
};

const pathExists = async (absolutePath) => {
  try {
    await fs.promises.access(absolutePath);
    return true;
  } catch (_err) {
    return false;
  }
};

const writeFileAtomic = async (absolutePath, buffer) => {
  await ensureDirectory(path.dirname(absolutePath));
  const tempPath = `${absolutePath}.tmp-${randomUUID()}`;
  await fs.promises.writeFile(tempPath, buffer);
  await fs.promises.rename(tempPath, absolutePath);
};

const optimizeImageToWebp = async (
  fileBuffer,
  { maxBytes = MAX_IMAGE_BYTES_DEFAULT, qualitySteps = QUALITY_STEPS, widthSteps = WIDTH_STEPS } = {}
) => {
  const metadata = await sharp(fileBuffer).metadata();
  const originalWidth = metadata.width ?? null;
  const widthCandidates = [
    undefined,
    ...widthSteps.filter((width) => (originalWidth ?? width + 1) > width),
  ];

  for (const candidateWidth of widthCandidates) {
    for (const quality of qualitySteps) {
      const pipeline = sharp(fileBuffer).rotate();
      if (candidateWidth) {
        pipeline.resize({ width: candidateWidth, withoutEnlargement: true });
      }
      const optimizedBuffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();
      if (optimizedBuffer.length <= maxBytes) {
        return optimizedBuffer;
      }
    }
  }

  throw new ImageOptimizationError(
    `Unable to optimize image under ${Math.round(maxBytes / (1024 * 1024))}MB. Please upload a smaller image.`
  );
};

const truncateSegment = (segment, maxLength) => {
  const normalized = String(segment || '').trim();
  if (!normalized) {
    return '';
  }
  if (!maxLength || normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.slice(0, maxLength).replace(/-+$/, '');
};

const buildEntityFolderName = (displayName, id, { maxSlugLength = 80 } = {}) => {
  const slug = truncateSegment(slugify(displayName || ''), maxSlugLength) || 'item';
  const idPart = String(id || '').trim() || randomUUID();
  return `${slug}-${idPart}`;
};

const saveWebpImage = async (fileBuffer, { relativeDir, filename, maxBytes } = {}) => {
  if (!relativeDir) {
    throw new Error('relativeDir is required');
  }
  if (!filename) {
    throw new Error('filename is required');
  }

  const normalizedDir = normalizePosixPath(relativeDir).replace(/^\/+/, '');
  const absoluteDir = path.resolve(uploadsRoot, ...normalizedDir.split('/'));
  const optimized = await optimizeImageToWebp(fileBuffer, { maxBytes });
  const absolutePath = path.join(absoluteDir, filename);
  await writeFileAtomic(absolutePath, optimized);
  return toUploadsUrlPath(path.posix.join(normalizedDir, filename));
};

const moveUploadsUrlPath = async (fromUploadsUrlPath, { relativeDir, filename } = {}) => {
  const fromAbs = resolveUploadsAbsolutePath(fromUploadsUrlPath);
  if (!fromAbs) {
    throw new Error('Invalid source uploads path');
  }
  if (!relativeDir) {
    throw new Error('relativeDir is required');
  }
  if (!filename) {
    throw new Error('filename is required');
  }

  const normalizedDir = normalizePosixPath(relativeDir).replace(/^\/+/, '');
  const toAbsDir = path.resolve(uploadsRoot, ...normalizedDir.split('/'));
  await ensureDirectory(toAbsDir);

  const toAbs = path.join(toAbsDir, filename);
  if (await pathExists(toAbs)) {
    await fs.promises.unlink(toAbs).catch(() => {});
  }

  try {
    await fs.promises.rename(fromAbs, toAbs);
  } catch (error) {
    if (error && error.code === 'EXDEV') {
      await fs.promises.copyFile(fromAbs, toAbs);
      await fs.promises.unlink(fromAbs).catch(() => {});
    } else {
      throw error;
    }
  }

  return toUploadsUrlPath(path.posix.join(normalizedDir, filename));
};

const safeUnlinkUploadsUrlPath = async (uploadsUrlPath) => {
  const abs = resolveUploadsAbsolutePath(uploadsUrlPath);
  if (!abs) {
    return;
  }
  await fs.promises.unlink(abs).catch(() => {});
};

const safeRemoveUploadsDir = async (relativeDir) => {
  const normalized = normalizePosixPath(relativeDir).replace(/^\/+/, '');
  if (!normalized) {
    return;
  }
  const absoluteDir = path.resolve(uploadsRoot, ...normalized.split('/'));
  const relativeCheck = path.relative(uploadsRoot, absoluteDir);
  if (relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) {
    throw new Error('Invalid uploads directory');
  }
  await fs.promises.rm(absoluteDir, { recursive: true, force: true }).catch(() => {});
};

const safeRemoveUploadsUrlPathDirectory = async (uploadsUrlPath) => {
  const rel = toUploadsRelativePosixPath(uploadsUrlPath);
  if (!rel) {
    return;
  }
  const directoryRel = path.posix.dirname(rel);
  await safeRemoveUploadsDir(directoryRel);
};

module.exports = {
  uploadsRoot,
  MAX_IMAGE_BYTES_DEFAULT,
  QUALITY_STEPS,
  WIDTH_STEPS,
  ImageOptimizationError,
  normalizePosixPath,
  toUploadsUrlPath,
  toUploadsRelativePosixPath,
  resolveUploadsAbsolutePath,
  pathExists,
  buildEntityFolderName,
  optimizeImageToWebp,
  saveWebpImage,
  moveUploadsUrlPath,
  safeUnlinkUploadsUrlPath,
  safeRemoveUploadsDir,
  safeRemoveUploadsUrlPathDirectory,
};

