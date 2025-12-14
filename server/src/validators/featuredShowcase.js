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
    variant: z.enum(['feature', 'tile']).default('tile'),
    title: z.string().min(2).max(160),
    subtitle: z.string().max(200).optional().default(''),
    category: z.string().max(120).optional().default(''),
    offer: z.string().max(120).optional().default(''),
    badgeText: z.string().max(60).optional().default(''),
    ctaText: z.string().min(2).max(60).optional().default('Shop Now'),
    linkUrl: z.string().min(1),
    price: z.string().max(60).optional().default(''),
    image: uploadsPathSchema,
    order: z.number().int().min(0).optional().default(0),
    altText: z.string().max(160).optional().default(''),
  })
  .strict();

const updateSchema = z
  .object({
    variant: z.enum(['feature', 'tile']).optional(),
    title: z.string().min(2).max(160).optional(),
    subtitle: z.string().max(200).optional(),
    category: z.string().max(120).optional(),
    offer: z.string().max(120).optional(),
    badgeText: z.string().max(60).optional(),
    ctaText: z.string().min(2).max(60).optional(),
    linkUrl: z.string().min(1).optional(),
    price: z.string().max(60).optional(),
    image: uploadsPathSchema.optional(),
    order: z.number().int().min(0).optional(),
    altText: z.string().max(160).optional(),
  })
  .strict();

module.exports = {
  validateCreateFeatured: (payload) => parseWithSchema(createSchema, payload),
  validateUpdateFeatured: (payload) => parseWithSchema(updateSchema, payload),
};
