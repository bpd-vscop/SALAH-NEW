const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const sharp = require('sharp');

const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads', 'products');
const MAX_STORED_PRODUCT_IMAGE_BYTES = 1024 * 1024;
const QUALITY_STEPS = [85, 80, 75, 70, 65, 60, 55, 50, 45];
const WIDTH_STEPS = [1600, 1400, 1200, 1000, 800, 600];

class ImageOptimizationError extends Error {}

const ensureProductsDirectory = async () => {
  await fs.promises.mkdir(uploadsRoot, { recursive: true });
};

const optimizeProductImage = async (fileBuffer) => {
  const metadata = await sharp(fileBuffer).metadata();
  const originalWidth = metadata.width ?? null;
  const widthCandidates = [
    undefined,
    ...WIDTH_STEPS.filter((width) => (originalWidth ?? width + 1) > width),
  ];

  for (const candidateWidth of widthCandidates) {
    for (const quality of QUALITY_STEPS) {
      const pipeline = sharp(fileBuffer).rotate();
      if (candidateWidth) {
        pipeline.resize({ width: candidateWidth, withoutEnlargement: true });
      }
      const optimizedBuffer = await pipeline.webp({ quality, effort: 4 }).toBuffer();
      if (optimizedBuffer.length <= MAX_STORED_PRODUCT_IMAGE_BYTES) {
        return optimizedBuffer;
      }
    }
  }

  throw new ImageOptimizationError(
    'Unable to optimize product image under 1MB. Please upload a smaller or lower-resolution image.'
  );
};

const saveProductImage = async (fileBuffer) => {
  await ensureProductsDirectory();
  const optimized = await optimizeProductImage(fileBuffer);
  const filename = `product-${Date.now()}-${randomUUID()}.webp`;
  await fs.promises.writeFile(path.join(uploadsRoot, filename), optimized);
  return path.posix.join('/uploads', 'products', filename);
};

module.exports = {
  MAX_STORED_PRODUCT_IMAGE_BYTES,
  QUALITY_STEPS,
  WIDTH_STEPS,
  ImageOptimizationError,
  saveProductImage,
};
