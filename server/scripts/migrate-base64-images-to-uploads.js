require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const path = require('path');
const mongoose = require('mongoose');

const { initMongo } = require('../src/config/mongo');

const Brand = require('../src/models/Brand');
const Manufacturer = require('../src/models/Manufacturer');
const Category = require('../src/models/Category');
const HeroSlide = require('../src/models/HeroSlide');
const FeaturedShowcase = require('../src/models/FeaturedShowcase');
const CategoryDisplayConfig = require('../src/models/CategoryDisplayConfig');
const ManufacturerDisplayConfig = require('../src/models/ManufacturerDisplayConfig');
const Product = require('../src/models/Product');

const {
  buildEntityFolderName,
  saveWebpImage,
  ImageOptimizationError,
} = require('../src/services/mediaStorageService');
const { randomUUID } = require('crypto');

const MAX_MARKETING_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_PRODUCT_IMAGE_BYTES = 1024 * 1024;

const parseCliOptions = () => {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    limit: null,
    collections: null,
  };

  const limitIndex = args.indexOf('--limit');
  if (limitIndex >= 0 && args[limitIndex + 1]) {
    const parsed = Number(args[limitIndex + 1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      options.limit = parsed;
    }
  }

  const collectionsIndex = args.indexOf('--collections');
  if (collectionsIndex >= 0 && args[collectionsIndex + 1]) {
    options.collections = args[collectionsIndex + 1]
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return options;
};

const shouldRunCollection = (options, key) => {
  if (!options.collections) {
    return true;
  }
  return options.collections.includes(key);
};

const isDataImageUrl = (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim();
  return normalized.startsWith('data:image/') && normalized.includes(';base64,');
};

const decodeDataUrlToBuffer = (dataUrl) => {
  const normalized = String(dataUrl || '').trim();
  const marker = ';base64,';
  const index = normalized.indexOf(marker);
  if (!normalized.startsWith('data:') || index === -1) {
    return null;
  }
  const base64 = normalized.slice(index + marker.length).trim();
  if (!base64) {
    return null;
  }
  return Buffer.from(base64, 'base64');
};

const migrateImageField = async (
  doc,
  fieldName,
  { relativeDir, filename, maxBytes, label, dryRun } = {}
) => {
  const current = doc[fieldName];
  if (!isDataImageUrl(current)) {
    return { changed: false };
  }

  const buffer = decodeDataUrlToBuffer(current);
  if (!buffer || buffer.length === 0) {
    console.warn(`[skip] ${label} ${doc._id}: invalid data URL for ${fieldName}`);
    return { changed: false };
  }

  if (dryRun) {
    console.log(`[dry-run] would migrate ${label} ${doc._id} ${fieldName} -> ${relativeDir}/${filename}`);
    return { changed: true };
  }

  const uploadedPath = await saveWebpImage(buffer, { relativeDir, filename, maxBytes });
  doc[fieldName] = uploadedPath;
  return { changed: true };
};

const safeSave = async (doc, label, dryRun) => {
  if (dryRun) {
    return;
  }
  await doc.save();
  console.log(`[ok] saved ${label} ${doc._id}`);
};

const migrateBrands = async (options) => {
  const cursor = Brand.find({}).cursor();
  let scanned = 0;
  let migrated = 0;

  for await (const brand of cursor) {
    scanned += 1;
    const folderName = buildEntityFolderName(brand.name, brand._id);
    const res = await migrateImageField(brand, 'logoImage', {
      relativeDir: path.posix.join('brands', folderName, 'images'),
      filename: 'logo.webp',
      maxBytes: MAX_MARKETING_IMAGE_BYTES,
      label: 'brand',
      dryRun: options.dryRun,
    });

    if (res.changed) {
      migrated += 1;
      await safeSave(brand, 'brand', options.dryRun);
    }

    if (options.limit && migrated >= options.limit) {
      break;
    }
  }

  return { scanned, migrated };
};

const migrateManufacturers = async (options) => {
  const cursor = Manufacturer.find({}).cursor();
  let scanned = 0;
  let migrated = 0;

  for await (const manufacturer of cursor) {
    scanned += 1;
    const folderName = buildEntityFolderName(manufacturer.name, manufacturer._id);
    let changed = false;

    const imagesDir = path.posix.join('manufacturers', folderName, 'images');
    const logo = await migrateImageField(manufacturer, 'logoImage', {
      relativeDir: imagesDir,
      filename: 'logo.webp',
      maxBytes: MAX_MARKETING_IMAGE_BYTES,
      label: 'manufacturer',
      dryRun: options.dryRun,
    });
    changed = changed || logo.changed;

    const hero = await migrateImageField(manufacturer, 'heroImage', {
      relativeDir: imagesDir,
      filename: 'hero.webp',
      maxBytes: MAX_MARKETING_IMAGE_BYTES,
      label: 'manufacturer',
      dryRun: options.dryRun,
    });
    changed = changed || hero.changed;

    if (changed) {
      migrated += 1;
      await safeSave(manufacturer, 'manufacturer', options.dryRun);
    }

    if (options.limit && migrated >= options.limit) {
      break;
    }
  }

  return { scanned, migrated };
};

const migrateCategories = async (options) => {
  const cursor = Category.find({}).cursor();
  let scanned = 0;
  let migrated = 0;

  for await (const category of cursor) {
    scanned += 1;
    const folderName = buildEntityFolderName(category.name, category._id);
    let changed = false;

    const imagesDir = path.posix.join('categories', folderName, 'images');
    const image = await migrateImageField(category, 'imageUrl', {
      relativeDir: imagesDir,
      filename: 'image.webp',
      maxBytes: MAX_MARKETING_IMAGE_BYTES,
      label: 'category',
      dryRun: options.dryRun,
    });
    changed = changed || image.changed;

    const hero = await migrateImageField(category, 'heroImageUrl', {
      relativeDir: imagesDir,
      filename: 'hero.webp',
      maxBytes: MAX_MARKETING_IMAGE_BYTES,
      label: 'category',
      dryRun: options.dryRun,
    });
    changed = changed || hero.changed;

    if (changed) {
      migrated += 1;
      await safeSave(category, 'category', options.dryRun);
    }

    if (options.limit && migrated >= options.limit) {
      break;
    }
  }

  return { scanned, migrated };
};

const migrateHeroSlides = async (options) => {
  const cursor = HeroSlide.find({}).cursor();
  let scanned = 0;
  let migrated = 0;

  for await (const slide of cursor) {
    scanned += 1;
    const folderName = buildEntityFolderName(slide.title, slide._id);
    let changed = false;

    const imagesDir = path.posix.join('home', 'hero-slides', folderName, 'images');
    const desktop = await migrateImageField(slide, 'desktopImage', {
      relativeDir: imagesDir,
      filename: 'desktop.webp',
      maxBytes: MAX_MARKETING_IMAGE_BYTES,
      label: 'hero-slide',
      dryRun: options.dryRun,
    });
    changed = changed || desktop.changed;

    const mobile = await migrateImageField(slide, 'mobileImage', {
      relativeDir: imagesDir,
      filename: 'mobile.webp',
      maxBytes: MAX_MARKETING_IMAGE_BYTES,
      label: 'hero-slide',
      dryRun: options.dryRun,
    });
    changed = changed || mobile.changed;

    if (changed) {
      migrated += 1;
      await safeSave(slide, 'hero-slide', options.dryRun);
    }

    if (options.limit && migrated >= options.limit) {
      break;
    }
  }

  return { scanned, migrated };
};

const migrateFeaturedShowcase = async (options) => {
  const cursor = FeaturedShowcase.find({}).cursor();
  let scanned = 0;
  let migrated = 0;

  for await (const item of cursor) {
    scanned += 1;
    const folderName = buildEntityFolderName(item.title, item._id);
    const variant = item.variant || 'tile';

    const res = await migrateImageField(item, 'image', {
      relativeDir: path.posix.join('home', 'featured-showcase', variant, folderName, 'images'),
      filename: 'image.webp',
      maxBytes: MAX_MARKETING_IMAGE_BYTES,
      label: 'featured-showcase',
      dryRun: options.dryRun,
    });

    if (res.changed) {
      migrated += 1;
      await safeSave(item, 'featured-showcase', options.dryRun);
    }

    if (options.limit && migrated >= options.limit) {
      break;
    }
  }

  return { scanned, migrated };
};

const migrateCategoryDisplayConfig = async (options) => {
  const cursor = CategoryDisplayConfig.find({}).cursor();
  let scanned = 0;
  let migrated = 0;

  for await (const config of cursor) {
    scanned += 1;
    const res = await migrateImageField(config, 'allCategoriesHeroImage', {
      relativeDir: path.posix.join('home', 'category-display', String(config._id), 'images'),
      filename: 'hero.webp',
      maxBytes: MAX_MARKETING_IMAGE_BYTES,
      label: 'category-display-config',
      dryRun: options.dryRun,
    });

    if (res.changed) {
      migrated += 1;
      await safeSave(config, 'category-display-config', options.dryRun);
    }

    if (options.limit && migrated >= options.limit) {
      break;
    }
  }

  return { scanned, migrated };
};

const migrateManufacturerDisplayConfig = async (options) => {
  const cursor = ManufacturerDisplayConfig.find({}).cursor();
  let scanned = 0;
  let migrated = 0;

  for await (const config of cursor) {
    scanned += 1;
    const res = await migrateImageField(config, 'allManufacturersHeroImage', {
      relativeDir: path.posix.join('home', 'manufacturer-display', String(config._id), 'images'),
      filename: 'hero.webp',
      maxBytes: MAX_MARKETING_IMAGE_BYTES,
      label: 'manufacturer-display-config',
      dryRun: options.dryRun,
    });

    if (res.changed) {
      migrated += 1;
      await safeSave(config, 'manufacturer-display-config', options.dryRun);
    }

    if (options.limit && migrated >= options.limit) {
      break;
    }
  }

  return { scanned, migrated };
};

const migrateProducts = async (options) => {
  const cursor = Product.find({}).cursor();
  let scanned = 0;
  let migrated = 0;

  const migrateProductImageValue = async (value, relativeDir) => {
    if (!isDataImageUrl(value)) {
      return value;
    }
    const buffer = decodeDataUrlToBuffer(value);
    if (!buffer || buffer.length === 0) {
      return value;
    }

    const filename = `migrated-${Date.now()}-${randomUUID()}.webp`;
    if (options.dryRun) {
      console.log(`[dry-run] would migrate product image -> ${relativeDir}/${filename}`);
      return value;
    }

    return saveWebpImage(buffer, {
      relativeDir,
      filename,
      maxBytes: MAX_PRODUCT_IMAGE_BYTES,
    });
  };

  for await (const product of cursor) {
    scanned += 1;
    const folderName = buildEntityFolderName(product.name, product._id);
    const imagesDir = path.posix.join('products', folderName, 'images');

    let changed = false;

    if (Array.isArray(product.images) && product.images.length > 0) {
      const nextImages = [];
      for (const value of product.images) {
        const nextValue = await migrateProductImageValue(value, imagesDir);
        if (nextValue !== value) {
          changed = true;
        }
        nextImages.push(nextValue);
      }
      if (changed) {
        product.images = nextImages;
      }
    }

    if (Array.isArray(product.variations) && product.variations.length > 0) {
      for (const variation of product.variations) {
        if (!variation || typeof variation.image !== 'string') {
          continue;
        }
        const nextValue = await migrateProductImageValue(variation.image, imagesDir);
        if (nextValue !== variation.image) {
          variation.image = nextValue;
          changed = true;
        }
      }
    }

    if (product.seo && typeof product.seo.openGraphImage === 'string') {
      const nextValue = await migrateProductImageValue(product.seo.openGraphImage, imagesDir);
      if (nextValue !== product.seo.openGraphImage) {
        product.seo.openGraphImage = nextValue;
        changed = true;
      }
    }

    if (changed) {
      migrated += 1;
      await safeSave(product, 'product', options.dryRun);
    }

    if (options.limit && migrated >= options.limit) {
      break;
    }
  }

  return { scanned, migrated };
};

const main = async () => {
  const options = parseCliOptions();

  console.log('Base64 image migration starting...');
  console.log(`- dryRun: ${options.dryRun}`);
  console.log(`- limit: ${options.limit ?? 'none'}`);
  console.log(`- collections: ${options.collections ? options.collections.join(', ') : 'all'}`);

  await initMongo();

  const results = {};

  const migrate = async (key, fn) => {
    if (!shouldRunCollection(options, key)) {
      console.log(`[skip] ${key}`);
      return;
    }

    try {
      results[key] = await fn(options);
      console.log(`[done] ${key}: scanned=${results[key].scanned} migrated=${results[key].migrated}`);
    } catch (error) {
      if (error instanceof ImageOptimizationError) {
        console.error(`[error] ${key}:`, error.message);
      } else {
        console.error(`[error] ${key}:`, error);
      }
      results[key] = { error: String(error?.message || error) };
    }
  };

  await migrate('brands', migrateBrands);
  await migrate('manufacturers', migrateManufacturers);
  await migrate('categories', migrateCategories);
  await migrate('heroSlides', migrateHeroSlides);
  await migrate('featuredShowcase', migrateFeaturedShowcase);
  await migrate('categoryDisplay', migrateCategoryDisplayConfig);
  await migrate('manufacturerDisplay', migrateManufacturerDisplayConfig);
  await migrate('products', migrateProducts);

  console.log('Migration summary:');
  console.log(JSON.stringify(results, null, 2));

  await mongoose.disconnect();
};

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
