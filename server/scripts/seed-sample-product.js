/* eslint-disable no-console */
const path = require('path');
const mongoose = require('mongoose');
const { initMongo } = require('../src/config/mongo');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Manufacturer = require('../src/models/Manufacturer');

const resolveEnvPath = () => {
  const localEnv = path.resolve(__dirname, '../.env.local');
  const rootEnv = path.resolve(__dirname, '../.env');
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    require('dotenv').config({ path: localEnv });
    if (process.env.MONGODB_URI || process.env.MONGO_HOST) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    require('dotenv').config({ path: rootEnv });
  } catch (error) {
    console.warn('No .env.local or .env file found. Using default Mongo connection settings.');
  }
};

const upsertCategory = async () => {
  const payload = {
    name: 'Diagnostic Tools & Programmers',
    slug: 'diagnostic-tools',
    imageUrl: 'https://images.ulksupply.dev/categories/diagnostic-tools.jpg',
    heroImageUrl: 'https://images.ulksupply.dev/categories/diagnostic-tools-hero.jpg',
  };

  let category = await Category.findOne({ slug: payload.slug });
  if (!category) {
    category = await Category.create(payload);
    console.log(`Created category ${category.name}`);
  } else {
    category.set(payload);
    await category.save();
  }
  return category;
};

const upsertManufacturer = async () => {
  const payload = {
    name: 'KeyDynamix Labs',
    slug: 'keydynamix-labs',
    logoImage:
      'https://images.ulksupply.dev/brands/keydynamix-logo.png',
    heroImage:
      'https://images.ulksupply.dev/brands/keydynamix-hero.jpg',
    order: 10,
    isActive: true,
  };

  let manufacturer = await Manufacturer.findOne({ slug: payload.slug });
  if (!manufacturer) {
    manufacturer = await Manufacturer.create(payload);
    console.log(`Created manufacturer ${manufacturer.name}`);
  } else {
    manufacturer.set(payload);
    await manufacturer.save();
  }
  return manufacturer;
};

const buildSampleProduct = (categoryId, manufacturer) => {
  const now = new Date();
  const saleEnd = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // +30 days

  return {
    name: 'KD MAX Pro Diagnostic Bundle',
    slug: 'kd-max-pro-diagnostic-bundle',
    sku: 'KD-MAX-PRO-001',
    productCode: 'KM-PRO-8A',
    productType: 'variable',
    status: 'published',
    visibility: 'catalog-and-search',
    categoryId,
    manufacturerId: manufacturer.id,
    manufacturerName: manufacturer.name,
    shortDescription:
      'All-in-one smart key programming bundle for 2010-2025 vehicles with guided workflows and wireless updates.',
    description: [
      'The KD MAX Pro Diagnostic Bundle gives professional locksmiths and advanced automotive shops a complete kit for programming modern smart keys and remotes.',
      'The package pairs the KD MAX tablet with a G-Box Mini, Smart Key Emulator set, and on-board diagnostics harness to cover both immobilizer and keyless access systems.',
      '',
      'Highlights:',
      '- Guided “quick program” flows for BMW, Mercedes, Toyota, Hyundai/Kia, Ford, GM, Honda and more.',
      '- Cloud profile sync so technicians share VIN history and successful programming recipes.',
      '- Integrated scope to verify key frequency, modulation strength, and rolling code status before delivery.',
      '',
      'Every bundle ships with step-by-step video tutorials, printable wiring diagrams, and priority access to KeyDynamix technical support.',
    ].join('\n'),
    price: 4995,
    salePrice: 4595,
    saleStartDate: now,
    saleEndDate: saleEnd,
    taxClass: 'professional-tools',
    tags: ['in stock', 'on sale'],
    featureHighlights: [
      'Supports 8A/4D/46 transponders',
      'Offline mode with 30 vehicle slots',
      'Includes Smart Emulator Kit',
      '1-year premium software updates',
    ],
    images: [
      'https://images.ulksupply.dev/products/kd-max-pro-bundle/main.jpg',
      'https://images.ulksupply.dev/products/kd-max-pro-bundle/tablet.jpg',
      'https://images.ulksupply.dev/products/kd-max-pro-bundle/emulators.jpg',
      'https://images.ulksupply.dev/products/kd-max-pro-bundle/case.jpg',
    ],
    videoUrls: [
      'https://www.youtube.com/embed/f8O6sP04XQk',
      'https://videos.ulksupply.dev/kd-max-pro/features.mp4',
    ],
    packageContents: [
      'KD MAX Pro tablet (2025 edition)',
      'Smart Key Emulator set (6 modules)',
      'G-Box Mini advanced gateway bypass',
      'OBD harness kit with breakout leads',
      'Protective travel case & foam inserts',
    ],
    specifications: [
      { label: 'Display', value: '8.0" IPS touch screen (1920×1200)' },
      { label: 'Battery', value: '10,000 mAh, Qi wireless charging' },
      { label: 'Connectivity', value: 'Wi-Fi 6, Bluetooth 5.3, USB-C' },
      { label: 'Supported protocols', value: 'CAN, CAN-FD, K-Line, DoIP' },
      { label: 'Operating temperature', value: '-10°C to 50°C' },
    ],
    attributes: {
      'Transponder coverage': '4D/46/47/48/8A/BE/ID94',
      'Maximum remote range': '120 feet',
      'Tablet OS': 'Android 13 (secured)',
    },
    customAttributes: {
      'Programming notes':
        'Points to vehicle battery maintainer automatically when voltage < 12.4V.',
      'Subscription reminder':
        'Renew premium plan before 2026-01-01 to lock in launch pricing.',
    },
    variationAttributes: ['Button layout', 'Shell color'],
    variations: [
      {
        name: '4-Button / Graphite',
        sku: 'KD-MAX-4B-GR',
        attributes: {
          'Button layout': '4 Buttons',
          'Shell color': 'Graphite',
        },
        price: 4995,
        salePrice: 4495,
        stockQuantity: 12,
        allowBackorder: false,
        image: 'https://images.ulksupply.dev/products/kd-max-pro-bundle/4button-graphite.jpg',
        weight: 4.1,
      },
      {
        name: '5-Button / Tactical Sand',
        sku: 'KD-MAX-5B-SND',
        attributes: {
          'Button layout': '5 Buttons + Panic',
          'Shell color': 'Tactical Sand',
        },
        price: 5095,
        salePrice: 4595,
        stockQuantity: 6,
        allowBackorder: true,
        image: 'https://images.ulksupply.dev/products/kd-max-pro-bundle/5button-sand.jpg',
        weight: 4.2,
      },
    ],
    documents: [
      {
        label: 'Programming quick-start guide (PDF)',
        url: 'https://docs.ulksupply.dev/kd-max-pro/quick-start.pdf',
      },
      {
        label: 'Vehicle coverage chart (CSV)',
        url: 'https://docs.ulksupply.dev/kd-max-pro/coverage.csv',
      },
    ],
    compatibility: [
      {
        yearStart: 2015,
        yearEnd: 2025,
        make: 'Toyota',
        model: 'Camry',
        subModel: 'LE/XLE Hybrid',
        engine: '2.5L / 2.5L Hybrid',
        notes: 'Push-to-start vehicles only',
      },
      {
        yearStart: 2018,
        yearEnd: 2024,
        make: 'Hyundai',
        model: 'Sonata',
        notes: 'Requires smart key slot adapter (included).',
      },
      {
        year: 2020,
        make: 'Lexus',
        model: 'RX350',
        subModel: 'F-Sport',
        engine: '3.5L V6',
        notes: 'Use Smart Emulator Module 4 for successful pairing.',
      },
    ],
    inventory: {
      quantity: 24,
      lowStockThreshold: 4,
      status: 'in_stock',
      allowBackorder: false,
      leadTime: 'Ships same business day if ordered before 3PM EST',
    },
    shipping: {
      weight: 4.2,
      weightUnit: 'lb',
      dimensions: {
        length: 16,
        width: 12,
        height: 8,
        unit: 'in',
      },
      shippingClass: 'diagnostic-kit',
      hazardous: false,
      warehouseLocation: 'A-03-12',
    },
    badges: [
      {
        label: 'Locksmith favorite',
        description: 'Voted #1 tool bundle by 1,200 certified locksmiths',
        icon: 'award',
      },
      {
        label: 'Free overnight shipping',
        description: 'Qualifies for complimentary overnight shipping in the continental US',
        icon: 'truck',
      },
    ],
    seo: {
      metaTitle: 'KD MAX Pro Diagnostic Bundle | KeyDynamix Labs',
      metaDescription:
        'Unlock modern smart keys faster with the KD MAX Pro Diagnostic Bundle. Includes emulators, G-Box Mini, guided programming, and a rugged travel case.',
      canonicalUrl: 'https://www.ulksupply.com/products/kd-max-pro-diagnostic-bundle',
      openGraphImage: 'https://images.ulksupply.dev/products/kd-max-pro-bundle/social-card.jpg',
    },
    support: {
      warranty: '12-month limited manufacturer warranty',
      returnPolicy: '30-day return window (15% restocking fee applies)',
      supportPhone: '+1-800-555-0199',
      supportEmail: 'support@ulksupply.com',
      liveChatUrl: 'https://chat.ulksupply.com?queue=kd-max-pro',
      supportHours: 'Mon-Fri 8:00 AM – 6:00 PM EST',
    },
    notes: {
      sales: 'Bundle qualifies for dealer loyalty pricing and free overnight shipping.',
      internal: 'Reserve four units in warehouse location A-03-12 for April training tour.',
    },
    reviewsSummary: {
      averageRating: 4.8,
      reviewCount: 164,
      ratingBreakdown: {
        5: 140,
        4: 18,
        3: 4,
        2: 1,
        1: 1,
      },
    },
  };
};

const seedSampleProduct = async () => {
  resolveEnvPath();
  await initMongo();

  const category = await upsertCategory();
  const manufacturer = await upsertManufacturer();

  const sampleData = buildSampleProduct(category.id, manufacturer);
  const existing = await Product.findOne({ slug: sampleData.slug });

  if (existing) {
    Object.assign(existing, sampleData);
    await existing.save();
    console.log(`Updated existing sample product: ${sampleData.name}`);
  } else {
    await Product.create(sampleData);
    console.log(`Created sample product: ${sampleData.name}`);
  }
};

seedSampleProduct()
  .catch((error) => {
    console.error('Failed to seed sample product', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
