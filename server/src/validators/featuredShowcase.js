const { z } = require('zod');
const { parseWithSchema } = require('./index');

const base64Regex = /^data:image\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

const featuredCreateSchema = z
  .object({
    variant: z.enum(['feature', 'tile']).default('tile'),
    title: z.string().min(2).max(160),
    subtitle: z.string().max(200).optional().default(''),
    category: z.string().max(120).optional().default(''),
    offer: z.string().max(120).optional().default(''),
    badgeText: z.string().max(60).optional().default(''),
    ctaText: z.string().min(2).max(60).optional().default('Shop Now'),
    linkUrl: z.string().min(1),
    price: z.string().max(60).optional().default(''),
    image: z.string().regex(base64Regex, 'image must be a base64 data URL'),
    order: z.number().int().min(0).optional().default(0),
    altText: z.string().max(160).optional().default(''),
  })
  .strict();

const featuredUpdateSchema = featuredCreateSchema.partial();

module.exports = {
  validateCreateFeatured: (payload) => parseWithSchema(featuredCreateSchema, payload),
  validateUpdateFeatured: (payload) => parseWithSchema(featuredUpdateSchema, payload),
};

