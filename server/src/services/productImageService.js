const path = require('path');
const { randomUUID } = require('crypto');
const {
  ImageOptimizationError,
  QUALITY_STEPS,
  WIDTH_STEPS,
  saveWebpImage,
} = require('./mediaStorageService');

const MAX_STORED_PRODUCT_IMAGE_BYTES = 1024 * 1024;
const DEFAULT_RELATIVE_DIR = path.posix.join('products', '_tmp', 'images');

const saveProductImage = async (fileBuffer, { relativeDir = DEFAULT_RELATIVE_DIR } = {}) => {
  const filename = `product-${Date.now()}-${randomUUID()}.webp`;
  return saveWebpImage(fileBuffer, {
    relativeDir,
    filename,
    maxBytes: MAX_STORED_PRODUCT_IMAGE_BYTES,
  });
};

module.exports = {
  MAX_STORED_PRODUCT_IMAGE_BYTES,
  QUALITY_STEPS,
  WIDTH_STEPS,
  ImageOptimizationError,
  saveProductImage,
};
