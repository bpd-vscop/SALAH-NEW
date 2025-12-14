const { z } = require('zod');
const { parseWithSchema } = require('./index');

const uploadsPathSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith('/uploads/'), {
    message: 'Image must be an uploaded image path',
  });

const createSchema = z
  .object({
    title: z.string().min(2).max(120),
    subtitle: z.string().max(160).optional().default(''),
    caption: z.string().max(240).optional().default(''),
    ctaText: z.string().min(2).max(60).optional().default('Shop Now'),
    linkUrl: z.string().min(1),
    desktopImage: uploadsPathSchema,
    mobileImage: uploadsPathSchema,
    order: z.number().int().min(0).optional().default(0),
    altText: z.string().max(160).optional().default(''),
  })
  .strict();

const updateSchema = z
  .object({
    title: z.string().min(2).max(120).optional(),
    subtitle: z.string().max(160).optional(),
    caption: z.string().max(240).optional(),
    ctaText: z.string().min(2).max(60).optional(),
    linkUrl: z.string().min(1).optional(),
    desktopImage: uploadsPathSchema.optional(),
    mobileImage: uploadsPathSchema.optional(),
    order: z.number().int().min(0).optional(),
    altText: z.string().max(160).optional(),
  })
  .strict();

module.exports = {
  validateCreateHeroSlide: (payload) => parseWithSchema(createSchema, payload),
  validateUpdateHeroSlide: (payload) => parseWithSchema(updateSchema, payload),
};
