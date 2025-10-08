const { z } = require('zod');
const { parseWithSchema } = require('./index');

const base64Regex = /^data:image\/(png|jpg|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

const heroSlideCreateSchema = z
  .object({
    title: z.string().min(2).max(120),
    subtitle: z.string().max(160).optional().default(''),
    caption: z.string().max(240).optional().default(''),
    ctaText: z.string().min(2).max(60).optional().default('Shop Now'),
    linkUrl: z.string().min(1),
    desktopImage: z.string().regex(base64Regex, 'desktopImage must be a base64 data URL'),
    mobileImage: z.string().regex(base64Regex, 'mobileImage must be a base64 data URL'),
    order: z.number().int().min(0).optional().default(0),
    altText: z.string().max(160).optional().default(''),
  })
  .strict();

const heroSlideUpdateSchema = heroSlideCreateSchema.partial();

module.exports = {
  validateCreateHeroSlide: (payload) => parseWithSchema(heroSlideCreateSchema, payload),
  validateUpdateHeroSlide: (payload) => parseWithSchema(heroSlideUpdateSchema, payload),
};

