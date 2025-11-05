const { z } = require('zod');
const mongoose = require('mongoose');
const { parseWithSchema } = require('./index');
const Product = require('../models/Product');

const tagsEnum = z.enum(Product.allowedTags);
const productTypeEnum = z.enum(Product.productTypes);
const productStatusEnum = z.enum(Product.productStatuses);
const inventoryStatusEnum = z.enum(Product.inventoryStatuses);
const visibilityEnum = z.enum(Product.visibilityOptions);

const objectId = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), 'Invalid identifier');

const urlSchema = z.string().url();
const optionalString = (max) => z.string().min(1).max(max);

const slugSchema = z
  .string()
  .min(2)
  .max(200)
  .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens');

const specificationSchema = z.object({
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(500),
});

const documentSchema = z.object({
  label: z.string().min(1).max(200),
  url: urlSchema,
});

const compatibilitySchema = z.object({
  yearStart: z.number().int().min(1900).max(2100).optional(),
  yearEnd: z.number().int().min(1900).max(2100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  make: z.string().min(1).max(120),
  model: z.string().min(1).max(120),
  subModel: z.string().min(1).max(120).optional(),
  engine: z.string().min(1).max(120).optional(),
  notes: z.string().min(1).max(300).optional(),
});

const variationSchema = z.object({
  sku: z.string().min(1).max(180).optional(),
  name: z.string().min(1).max(200).optional(),
  attributes: z.record(z.string()).optional(),
  price: z.number().min(0).optional(),
  salePrice: z.number().min(0).nullable().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  allowBackorder: z.boolean().optional(),
  image: urlSchema.optional(),
  weight: z.number().min(0).optional(),
});

const badgesSchema = z.object({
  label: z.string().min(1).max(150),
  description: z.string().min(1).max(300).optional(),
  icon: z.string().min(1).max(150).optional(),
});

const supportSchema = z.object({
  warranty: z.string().min(1).max(200).optional(),
  returnPolicy: z.string().min(1).max(200).optional(),
  supportPhone: z.string().min(1).max(50).optional(),
  supportEmail: z.string().email().optional(),
  liveChatUrl: urlSchema.optional(),
  supportHours: z.string().min(1).max(200).optional(),
});

const reviewsSummarySchema = z.object({
  averageRating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  ratingBreakdown: z.record(z.number().min(0)).optional(),
});

const inventorySchema = z
  .object({
    quantity: z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    status: inventoryStatusEnum.optional(),
    allowBackorder: z.boolean().optional(),
    leadTime: z.string().min(1).max(200).optional(),
  })
  .strict();

const dimensionsSchema = z
  .object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
    unit: z.string().min(1).max(10).optional(),
  })
  .strict();

const shippingSchema = z
  .object({
    weight: z.number().min(0).optional(),
    weightUnit: z.string().min(1).max(10).optional(),
    dimensions: dimensionsSchema.optional(),
    shippingClass: z.string().min(1).max(120).optional(),
    hazardous: z.boolean().optional(),
    warehouseLocation: z.string().min(1).max(120).optional(),
  })
  .strict();

const seoSchema = z
  .object({
    metaTitle: z.string().min(1).max(150).optional(),
    metaDescription: z.string().min(1).max(320).optional(),
    canonicalUrl: urlSchema.optional(),
    openGraphImage: urlSchema.optional(),
  })
  .strict();

const notesSchema = z
  .object({
    sales: z.string().min(1).max(400).optional(),
    internal: z.string().min(1).max(400).optional(),
  })
  .strict();

const baseFields = {
  name: z.string().min(2).max(200),
  slug: slugSchema.optional(),
  sku: z.string().min(1).max(180).optional(),
  productCode: z.string().min(1).max(180).optional(),
  productType: productTypeEnum.optional(),
  status: productStatusEnum.optional(),
  visibility: visibilityEnum.optional(),
  categoryId: objectId,
  manufacturerId: objectId.optional(),
  manufacturerName: z.string().min(1).max(200).optional(),
  tags: z.array(tagsEnum).optional(),
  shortDescription: z.string().max(1200).optional(),
  description: z.string().max(10000).optional(),
  featureHighlights: z.array(optionalString(200)).max(20).optional(),
  images: z.array(urlSchema).max(20).optional(),
  videoUrls: z.array(urlSchema).max(10).optional(),
  price: z.number().min(0).optional(),
  salePrice: z.number().min(0).nullable().optional(),
  saleStartDate: z.string().datetime().nullable().optional(),
  saleEndDate: z.string().datetime().nullable().optional(),
  taxClass: z.string().min(1).max(120).optional(),
  inventory: inventorySchema.optional(),
  shipping: shippingSchema.optional(),
  packageContents: z.array(optionalString(160)).max(50).optional(),
  specifications: z.array(specificationSchema).max(100).optional(),
  attributes: z.record(z.string()).optional(),
  customAttributes: z.record(z.string()).optional(),
  variationAttributes: z.array(z.string().min(1).max(120)).max(10).optional(),
  variations: z.array(variationSchema).optional(),
  documents: z.array(documentSchema).max(50).optional(),
  compatibility: z.array(compatibilitySchema).max(500).optional(),
  relatedProductIds: z.array(objectId).optional(),
  upsellProductIds: z.array(objectId).optional(),
  crossSellProductIds: z.array(objectId).optional(),
  seo: seoSchema.optional(),
  badges: z.array(badgesSchema).max(10).optional(),
  support: supportSchema.optional(),
  reviewsSummary: reviewsSummarySchema.optional(),
  notes: notesSchema.optional(),
};

const createProductSchema = z
  .object({
    name: baseFields.name,
    slug: baseFields.slug,
    sku: baseFields.sku,
    productCode: baseFields.productCode,
    productType: baseFields.productType,
    status: baseFields.status,
    visibility: baseFields.visibility,
    categoryId: baseFields.categoryId,
    manufacturerId: baseFields.manufacturerId,
    manufacturerName: baseFields.manufacturerName,
    tags: baseFields.tags,
    shortDescription: baseFields.shortDescription,
    description: baseFields.description,
    featureHighlights: baseFields.featureHighlights,
    images: baseFields.images,
    videoUrls: baseFields.videoUrls,
    price: baseFields.price,
    salePrice: baseFields.salePrice,
    saleStartDate: baseFields.saleStartDate,
    saleEndDate: baseFields.saleEndDate,
    taxClass: baseFields.taxClass,
    inventory: baseFields.inventory,
    shipping: baseFields.shipping,
    packageContents: baseFields.packageContents,
    specifications: baseFields.specifications,
    attributes: baseFields.attributes,
    customAttributes: baseFields.customAttributes,
    variationAttributes: baseFields.variationAttributes,
    variations: baseFields.variations,
    documents: baseFields.documents,
    compatibility: baseFields.compatibility,
    relatedProductIds: baseFields.relatedProductIds,
    upsellProductIds: baseFields.upsellProductIds,
    crossSellProductIds: baseFields.crossSellProductIds,
    seo: baseFields.seo,
    badges: baseFields.badges,
    support: baseFields.support,
    reviewsSummary: baseFields.reviewsSummary,
    notes: baseFields.notes,
  })
  .strict();

const updateProductSchema = z
  .object({
    name: baseFields.name.optional(),
    slug: baseFields.slug,
    sku: baseFields.sku,
    productCode: baseFields.productCode,
    productType: baseFields.productType,
    status: baseFields.status,
    visibility: baseFields.visibility,
    categoryId: baseFields.categoryId.optional(),
    manufacturerId: baseFields.manufacturerId,
    manufacturerName: baseFields.manufacturerName,
    tags: baseFields.tags,
    shortDescription: baseFields.shortDescription,
    description: baseFields.description,
    featureHighlights: baseFields.featureHighlights,
    images: baseFields.images,
    videoUrls: baseFields.videoUrls,
    price: baseFields.price,
    salePrice: baseFields.salePrice,
    saleStartDate: baseFields.saleStartDate,
    saleEndDate: baseFields.saleEndDate,
    taxClass: baseFields.taxClass,
    inventory: baseFields.inventory,
    shipping: baseFields.shipping,
    packageContents: baseFields.packageContents,
    specifications: baseFields.specifications,
    attributes: baseFields.attributes,
    customAttributes: baseFields.customAttributes,
    variationAttributes: baseFields.variationAttributes,
    variations: baseFields.variations,
    documents: baseFields.documents,
    compatibility: baseFields.compatibility,
    relatedProductIds: baseFields.relatedProductIds,
    upsellProductIds: baseFields.upsellProductIds,
    crossSellProductIds: baseFields.crossSellProductIds,
    seo: baseFields.seo,
    badges: baseFields.badges,
    support: baseFields.support,
    reviewsSummary: baseFields.reviewsSummary,
    notes: baseFields.notes,
  })
  .strict();

module.exports = {
  validateCreateProduct: (payload) => parseWithSchema(createProductSchema, payload),
  validateUpdateProduct: (payload) => parseWithSchema(updateProductSchema, payload),
};
